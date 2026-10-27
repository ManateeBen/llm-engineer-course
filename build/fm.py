#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""fm.py — 单元/ gate 文件的 frontmatter 简易解析器。

不用 PyYAML 的原因：文献条目里含半角冒号加空格（如
*Artificial Intelligence: A Modern Approach*），标准 YAML 会把列表项
解析成 mapping，信息被扭曲。这里按行原样保留，零 surprises。

支持：
    key: value          # 标量（首尾成对引号自动剥除）
      - item            # '-' 列表项，文本原样保留
"""

import re

_KEY_RE = re.compile(r"^([A-Za-z_]\w*)\s*:\s*(.*)$")


def parse_frontmatter(text):
    meta = {}
    cur_key = None
    for raw in text.splitlines():
        ln = raw.rstrip()
        stripped = ln.strip()
        if not stripped:
            continue
        if stripped.startswith("- "):
            if cur_key is not None:
                item = stripped[2:].strip()
                if not isinstance(meta.get(cur_key), list):
                    meta[cur_key] = []
                meta[cur_key].append(item)
            continue
        m = _KEY_RE.match(stripped)
        if m:
            cur_key = m.group(1)
            val = m.group(2).strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                val = val[1:-1]
            meta[cur_key] = val
    return meta


def split_frontmatter(text):
    """返回 (meta_dict, body_text)。没有 frontmatter 时 meta 为 {}。"""
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not m:
        return {}, text
    return parse_frontmatter(m.group(1)), m.group(2)
