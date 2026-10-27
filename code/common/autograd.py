"""教学标量反向自动微分；只用标准库。对应0-4、2-0。"""
import math


class Value:
    def __init__(self, data, parents=(), backward=None):
        self.data = float(data)
        self.grad = 0.0
        self.parents = tuple(parents)
        self._backward = backward or (lambda: None)

    def __add__(self, other):
        other = as_value(other)
        out = Value(self.data + other.data, (self, other))
        def backward():
            self.grad += out.grad
            other.grad += out.grad
        out._backward = backward
        return out

    __radd__ = __add__

    def __mul__(self, other):
        other = as_value(other)
        out = Value(self.data * other.data, (self, other))
        def backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = backward
        return out

    __rmul__ = __mul__

    def __pow__(self, exponent):
        out = Value(self.data ** exponent, (self,))
        def backward():
            self.grad += exponent * self.data ** (exponent - 1) * out.grad
        out._backward = backward
        return out

    def __neg__(self):
        return self * -1

    def __sub__(self, other):
        return self + -as_value(other)

    def __rsub__(self, other):
        return as_value(other) + -self

    def __truediv__(self, other):
        return self * as_value(other) ** -1

    def exp(self):
        out = Value(math.exp(self.data), (self,))
        def backward():
            self.grad += out.data * out.grad
        out._backward = backward
        return out

    def log(self):
        out = Value(math.log(self.data), (self,))
        def backward():
            self.grad += out.grad / self.data
        out._backward = backward
        return out

    def relu(self):
        out = Value(max(0.0, self.data), (self,))
        def backward():
            self.grad += (self.data > 0) * out.grad
        out._backward = backward
        return out

    def backward(self):
        # 迭代拓扑排序避免长序列触发Python递归深度限制。
        order, seen, stack = [], set(), [(self, False)]
        while stack:
            node, expanded = stack.pop()
            if expanded:
                order.append(node)
            elif node not in seen:
                seen.add(node)
                stack.append((node, True))
                stack.extend((p, False) for p in node.parents if p not in seen)
        for node in order:
            node.grad = 0.0
        self.grad = 1.0
        for node in reversed(order):
            node._backward()


def as_value(x):
    return x if isinstance(x, Value) else Value(x)


def dot(a, b):
    if len(a) != len(b):
        raise ValueError("点积维度不一致")
    return sum((x * y for x, y in zip(a, b)), Value(0))


def linear(x, weight):
    return [dot(row, x) for row in weight]


def softmax(values):
    # 减最大值只用于稳定计算；平移不改变softmax及其梯度。
    peak = max(v.data for v in values)
    exps = [(v - peak).exp() for v in values]
    total = sum(exps)
    return [v / total for v in exps]
