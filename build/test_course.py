"""python -m unittest discover -s build -p test_*.py"""
import importlib.util
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build import parse_exercises, parse_exits, render_ex, read_unit, md_to_html
ROOT=Path(__file__).resolve().parent.parent


def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m


class ContentTests(unittest.TestCase):
    def test_inline_question_survives_and_answer_is_hidden(self):
        source="**练习 1** 题干在同一行\n\n**参考答案：**\n正确答案"
        data=parse_exercises(source)[0]
        self.assertEqual(data["question"],"题干在同一行")
        html=render_ex(source)
        self.assertIn('ex-body"><p>题干在同一行',html)
        self.assertGreater(html.index("正确答案"),html.index("<details"))

    def test_missing_answers_fail_instead_of_silent_empty(self):
        with self.assertRaises(ValueError):render_ex("**练习 1** 缺答案")

    def test_numbered_exits_and_escaped_formulas(self):
        self.assertEqual(parse_exits("1. 动作一\n- 动作二"),["动作一","动作二"])
        self.assertIn("&lt;",md_to_html(r"\(x_{<t}\)"))

    def test_all_lessons_have_real_exercise_fields(self):
        for p in (ROOT/"content").glob("[0-9]*-*.md"):
            _,s=read_unit(p)
            with self.subTest(unit=p.stem):
                self.assertTrue(parse_exits(s["exit"]))
                for ex in parse_exercises(s["ex"]):
                    self.assertTrue(ex["question"])
                    self.assertTrue(ex["answer"])


class ModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.gpt=module("tinygpt",ROOT/"code/01-nanogpt/main.py")

    def test_attention_cannot_see_future(self):
        m=self.gpt.TinyGPT()
        a=m.forward([0,1,2]);b=m.forward([0,1,3])
        for left,right in zip(a[0]+a[1],b[0]+b[1]):
            self.assertAlmostEqual(left.data,right.data,places=12)

    def test_attention_gradient_matches_finite_difference(self):
        m=self.gpt.TinyGPT()
        loss=m.loss([0,1,2],[1,2,3]);loss.backward()
        p=m.weights["q"][0][0];analytic=p.grad;original=p.data;h=1e-5
        p.data=original+h;plus=m.loss([0,1,2],[1,2,3]).data
        p.data=original-h;minus=m.loss([0,1,2],[1,2,3]).data
        p.data=original
        self.assertAlmostEqual(analytic,(plus-minus)/(2*h),places=7)

    def test_shared_node_gradient_and_repeat_backward(self):
        from autograd import Value
        x=Value(3);y=x*x+x
        y.backward();self.assertEqual(x.grad,7)
        y.backward();self.assertEqual(x.grad,7)

    def test_rag_does_not_cite_deleted_evidence(self):
        rag=module("rag",ROOT/"code/07-rag/main.py")
        self.assertTrue(rag.answer("OOMKilled",[])['refused'])
        self.assertFalse(rag.answer("OOMKilled")['refused'])


if __name__=="__main__":unittest.main()
