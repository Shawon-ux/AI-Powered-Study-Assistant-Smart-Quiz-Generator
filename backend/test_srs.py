from srs import sm2


def test_fail_resets():
    ease, interval, reps, _ = sm2(2.5, 10, 4, 1)
    assert (interval, reps) == (1, 0)


def test_progression():
    e, i, r, _ = sm2(2.5, 0, 0, 5)
    assert i == 1
    e, i, r, _ = sm2(e, i, r, 5)
    assert i == 6
    e, i, r, _ = sm2(e, i, r, 4)
    assert i == round(6 * e) or i > 6


def test_ease_floor():
    e, *_ = sm2(1.3, 6, 2, 3)
    assert e >= 1.3
