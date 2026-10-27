"""离线RAG检索基线：BM25、证据引用、无证据拒答和逐题评测。

默认回答为原文摘录，不调用LLM；用于先验证检索与引用这一层。
"""
import argparse
from collections import Counter
import json
import math
import re

# 自编演示知识库；真实文档应按标题分块并保留版本、父块和权限元数据。
DOCUMENTS = [
    {"id":"ops-1","version":1,"text":"CrashLoopBackOff 表示容器反复退出。先查看容器日志，再检查退出码、启动命令和健康检查配置。"},
    {"id":"ops-2","version":1,"text":"OOMKilled 表示进程因内存问题被终止。检查容器内存上限与实际峰值，排查泄漏，再决定优化程序或增加内存。"},
    {"id":"ops-3","version":1,"text":"连接超时先检查目标地址、端口、DNS解析和网络策略，再检查服务监听与负载。"},
    {"id":"ops-4","version":1,"text":"日志保留周期为7天，超过7天的日志由清理任务删除。需要长期保存时应提前归档。"}]
CASES = [
    ("CrashLoopBackOff 怎么排查？","ops-1"),
    ("OOMKilled 怎么办？","ops-2"),
    ("连接超时要检查什么？","ops-3"),
    ("日志保留多久？","ops-4"),
    ("火星明日气温？",None),
    ("香蕉售价？",None)]


def tokens(text):
    words=re.findall(r"[a-z0-9_]+",text.lower())
    for segment in re.findall(r"[\u4e00-\u9fff]+",text):
        words.extend(segment[i:i+2] for i in range(len(segment)-1))
    return words


def retrieve(query, documents=DOCUMENTS, k=2):
    if not documents:return []
    counts=[Counter(tokens(d["text"])) for d in documents]
    sizes=[sum(c.values()) for c in counts]
    average=sum(sizes)/len(sizes) or 1
    results=[]
    for doc, count, size in zip(documents,counts,sizes):
        score=0.0
        for term in set(tokens(query)):
            df=sum(term in other for other in counts)
            idf=math.log(1+(len(documents)-df+.5)/(df+.5))
            tf=count[term]
            score+=idf*tf*2.5/(tf+1.5*(.25+.75*size/average))
        results.append((score,doc))
    return sorted(results,key=lambda pair:(-pair[0],pair[1]["id"]))[:k]


def answer(query, documents=DOCUMENTS, threshold=.5):
    hits=retrieve(query,documents)
    if not hits or hits[0][0]<threshold:
        return {"answer":"知识库中没有足够证据。","sources":[],"refused":True}
    score,doc=hits[0]
    return {"answer":doc["text"]+" ["+doc["id"]+"]",
            "sources":[{"id":doc["id"],"version":doc["version"]}],
            "score":score,"refused":False}


def evaluate():
    results=[]
    for query,expected in CASES:
        out=answer(query)
        actual=out["sources"][0]["id"] if out["sources"] else None
        results.append({"query":query,"expected":expected,"actual":actual,"ok":actual==expected})
    # 删除测试：检索器每次接收当前快照，已删除记录不可再被引用。
    remaining=[d for d in DOCUMENTS if d["id"]!="ops-2"]
    deleted=answer("OOMKilled",remaining)
    assert not deleted["sources"]
    report={"retrieval_and_refusal_passed":sum(r["ok"] for r in results),"total":len(results),
            "deleted_document_test":True,"cases":results,
            "scope":"自编小样例的检索/摘录基线，不是大规模检索或生成质量评测"}
    print(json.dumps(report,ensure_ascii=False,indent=2))
    assert all(r["ok"] for r in results)
    return report


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--query")
    args=parser.parse_args()
    if args.query:print(json.dumps(answer(args.query),ensure_ascii=False,indent=2))
    else:evaluate()
