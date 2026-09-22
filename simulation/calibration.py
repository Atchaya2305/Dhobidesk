import pandas as pd
import numpy as np

def rolling_variance(series, window=10):
    return series.rolling(window).var().fillna(0)

def calibrate_thresholds(df):
    """Feed one full cycle, auto-derive thresholds for idle/washing/spinning."""
    df = df.copy()
    df["accel_mag"] = np.sqrt(df.accel_x**2 + df.accel_y**2 + df.accel_z**2)
    df["accel_var"] = rolling_variance(df.accel_mag)

    stats = df.groupby("true_state").agg(
        var_mean=("accel_var", "mean"),
        var_std=("accel_var", "std"),
        cur_mean=("current", "mean"),
        cur_std=("current", "std"),
    )

    thresholds = {
        "idle_to_washing_var": (stats.loc["idle", "var_mean"] + stats.loc["washing", "var_mean"]) / 2,
        "washing_to_spinning_var": (stats.loc["washing", "var_mean"] + stats.loc["spinning", "var_mean"]) / 2,
        "idle_current_max": stats.loc["idle", "cur_mean"] + 3 * stats.loc["idle", "cur_std"],
        "washing_current_min": stats.loc["washing", "cur_mean"] - 2 * stats.loc["washing", "cur_std"],
        "spinning_current_min": stats.loc["spinning", "cur_mean"] - 2 * stats.loc["spinning", "cur_std"],
    }
    return thresholds


if __name__ == "__main__":
    df = pd.read_csv("../data/simulated_cycle_front_load.csv")
    th = calibrate_thresholds(df)
    for k, v in th.items():
        print(f"{k}: {v:.4f}")