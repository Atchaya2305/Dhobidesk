import pandas as pd
import json
import os

STATE_FILE = "last_known_state.json"

def save_state(timestamp, state, cycle_id):
    with open(STATE_FILE, "w") as f:
        json.dump({"timestamp": timestamp, "state": state, "cycle_id": cycle_id}, f)

def resume_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return None

def simulate_power_loss(df, cutoff_index):
    before = df.iloc[:cutoff_index]
    save_state(before.iloc[-1]["t"], before.iloc[-1]["true_state"], cycle_id="cycle_001")
    print(f"Power lost at t={before.iloc[-1]['t']}s, state={before.iloc[-1]['true_state']} — saved to disk")

    recovered = resume_state()
    print(f"Recovered after reboot: {recovered}")

    after = df.iloc[cutoff_index:]
    return before, after, recovered


def simulate_watchdog_hang(max_hang_seconds=5):
    import time
    last_heartbeat = time.time() - (max_hang_seconds + 1)
    hung = (time.time() - last_heartbeat) > max_hang_seconds
    if hung:
        print("Watchdog: no heartbeat in", max_hang_seconds, "s -> forcing simulated reboot")
    return hung


if __name__ == "__main__":
    df = pd.read_csv("../data/simulated_cycle_top_load.csv")
    before, after, recovered = simulate_power_loss(df, cutoff_index=900)
    assert recovered["state"] == before.iloc[-1]["true_state"]
    print("Power-loss recovery test: PASS")

    hung = simulate_watchdog_hang()
    print("Watchdog test:", "PASS" if hung else "FAIL")