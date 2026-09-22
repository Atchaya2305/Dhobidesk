import numpy as np
import pandas as pd

SAMPLE_RATE_HZ = 10          # 10 samples/sec, matches typical ESP32 polling rate
NOISE_STD = 0.03

def gen_state_segment(state, duration_s, machine_type="top_load", rng=None):
    """Generate accel (x,y,z) and current readings for one state segment."""
    rng = rng or np.random.default_rng()
    n = int(duration_s * SAMPLE_RATE_HZ)
    t = np.arange(n) / SAMPLE_RATE_HZ

    profile = {
        "top_load":  {"wash_amp": 0.15, "wash_freq": 0.8, "spin_amp": 1.2, "spin_freq": 6.0, "cur_wash": 1.8, "cur_spin": 3.5},
        "front_load":{"wash_amp": 0.25, "wash_freq": 0.5, "spin_amp": 2.0, "spin_freq": 9.0, "cur_wash": 1.5, "cur_spin": 4.5},
        "twin_tub":  {"wash_amp": 0.20, "wash_freq": 0.6, "spin_amp": 1.5, "spin_freq": 7.0, "cur_wash": 2.0, "cur_spin": 3.0},
    }[machine_type]

    if state == "idle":
        ax = rng.normal(0, NOISE_STD, n)
        ay = rng.normal(0, NOISE_STD, n)
        az = rng.normal(1.0, NOISE_STD, n)
        current = np.abs(rng.normal(0.05, 0.02, n))

    elif state == "washing":
        amp, freq = profile["wash_amp"], profile["wash_freq"]
        ax = amp * np.sin(2 * np.pi * freq * t) + rng.normal(0, NOISE_STD, n)
        ay = amp * np.cos(2 * np.pi * freq * t * 0.7) + rng.normal(0, NOISE_STD, n)
        az = 1.0 + rng.normal(0, NOISE_STD, n)
        current = profile["cur_wash"] + rng.normal(0, 0.15, n)

    elif state == "spinning":
        amp, freq = profile["spin_amp"], profile["spin_freq"]
        ax = amp * np.sin(2 * np.pi * freq * t) + rng.normal(0, NOISE_STD * 2, n)
        ay = amp * np.sin(2 * np.pi * freq * t + 1.2) + rng.normal(0, NOISE_STD * 2, n)
        az = 1.0 + amp * 0.3 * np.sin(2 * np.pi * freq * t) + rng.normal(0, NOISE_STD, n)
        current = profile["cur_spin"] + rng.normal(0, 0.25, n)

    elif state == "done":
        ax = rng.normal(0, NOISE_STD, n)
        ay = rng.normal(0, NOISE_STD, n)
        az = rng.normal(1.0, NOISE_STD, n)
        current = np.abs(rng.normal(0.05, 0.02, n))

    df = pd.DataFrame({"t": t, "accel_x": ax, "accel_y": ay, "accel_z": az,
                        "current": current, "true_state": state})
    return df


def inject_noise_events(df, rng, n_events=3):
    idxs = rng.integers(0, len(df) - 5, size=n_events)
    for i in idxs:
        df.loc[i:i+3, ["accel_x", "accel_y"]] += rng.normal(0.8, 0.2)
    return df


def generate_full_cycle(machine_type="top_load", seed=None):
    rng = np.random.default_rng(seed)
    segments = [
        gen_state_segment("idle", 20, machine_type, rng),
        gen_state_segment("washing", 120, machine_type, rng),
        gen_state_segment("spinning", 60, machine_type, rng),
        gen_state_segment("done", 30, machine_type, rng),
    ]
    full = pd.concat(segments, ignore_index=True)
    full["t"] = np.arange(len(full)) / SAMPLE_RATE_HZ
    full = inject_noise_events(full, rng)
    full["machine_type"] = machine_type
    return full


if __name__ == "__main__":
    for mtype in ["top_load", "front_load", "twin_tub"]:
        df = generate_full_cycle(machine_type=mtype, seed=42)
        df.to_csv(f"../data/simulated_cycle_{mtype}.csv", index=False)
        print(f"Generated {mtype}: {len(df)} samples -> data/simulated_cycle_{mtype}.csv")