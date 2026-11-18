from datetime import date, timedelta


def sm2(ease: float, interval: int, reps: int, q: int):
    """SM-2. q is recall quality 0-5. Returns (ease, interval, reps, due)."""
    if q < 3:
        reps, interval = 0, 1
    else:
        reps += 1
        if reps == 1:
            interval = 1
        elif reps == 2:
            interval = 6
        else:
            interval = round(interval * ease)
        ease = max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    return ease, interval, reps, date.today() + timedelta(days=interval)
