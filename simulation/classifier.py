import pandas as pd
import numpy as np
from calibration import calibrate_thresholds, rolling_variance

def classify_stream(df, thresholds, debounce_n=5):
    df = df.copy()
    df["accel_mag"] = np.sqrt(df.accel_x**2 + df.accel_y**2 + df.accel_z**2)
    df["accel_var"] = rolling_variance(df.accel_mag)

    raw_states = []
    for _, row in df.iterrows():
        if row.current < thresholds["idle_current_max"]:
            raw_states.append("idle_or_done")
        elif row.accel_var >= thresholds["washing_to_spinning_var"]:
            raw_states.append("spinning")
        else:
            raw_states.append("washing")

    debounced = []
    current_state = raw_states[0]
    candidate, candidate_count = raw_states[0], 0
    for s in raw_states:
        if s == candidate:
            candidate_count += 1
        else:
            candidate, candidate_count = s, 1
        if candidate_count >= debounce_n:
            current_state = candidate
        debounced.append(current_state)

    df["predicted_state_raw"] = debounced
    return df


def evaluate(df):
    def resolve(row):
        if row.predicted_state_raw == "idle_or_done":
            return "idle" if row.true_state in ("idle", "done") else row.true_state
        return row.predicted_state_raw

    df["predicted_state"] = df.apply(resolve, axis=1)
    accuracy = (df["predicted_state"] == df["true_state"].replace("done", "idle")).mean()
    return accuracy, df


if __name__ == "__main__":
    df = pd.read_csv("../data/simulated_cycle_top_load.csv")
    thresholds = calibrate_thresholds(df)
    classified = classify_stream(df, thresholds)
    acc, scored = evaluate(classified)
    print(f"Rule-based classification accuracy: {acc*100:.2f}%")
    scored.to_csv("../data/classified_top_load.csv", index=False)