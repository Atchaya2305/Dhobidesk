import os
import sys
import unittest
import numpy as np
import pandas as pd

# Add simulation dir to sys.path so modules can be imported directly
sim_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if sim_dir not in sys.path:
    sys.path.insert(0, sim_dir)

from calibration import rolling_variance, calibrate_thresholds
from classifier import classify_stream, evaluate


class TestClassifier(unittest.TestCase):
    def setUp(self):
        # Generate synthetic sensor dataframe representing idle, washing, and spinning
        np.random.seed(42)
        n_points = 50

        # Idle: near zero current, near zero acceleration fluctuations
        idle_data = {
            "t": np.linspace(0, 5, n_points),
            "accel_x": np.random.normal(0, 0.01, n_points),
            "accel_y": np.random.normal(0, 0.01, n_points),
            "accel_z": np.random.normal(1.0, 0.01, n_points),
            "current": np.random.normal(0.05, 0.01, n_points),
            "true_state": ["idle"] * n_points,
        }

        # Washing: moderate current, moderate acceleration vibration
        wash_data = {
            "t": np.linspace(5.1, 10, n_points),
            "accel_x": np.random.normal(0, 0.2, n_points),
            "accel_y": np.random.normal(0, 0.2, n_points),
            "accel_z": np.random.normal(1.0, 0.2, n_points),
            "current": np.random.normal(2.5, 0.2, n_points),
            "true_state": ["washing"] * n_points,
        }

        # Spinning: high current, violent vibration
        spin_data = {
            "t": np.linspace(10.1, 15, n_points),
            "accel_x": np.random.normal(0, 0.8, n_points),
            "accel_y": np.random.normal(0, 0.8, n_points),
            "accel_z": np.random.normal(1.0, 0.8, n_points),
            "current": np.random.normal(4.0, 0.3, n_points),
            "true_state": ["spinning"] * n_points,
        }

        self.df = pd.concat(
            [pd.DataFrame(idle_data), pd.DataFrame(wash_data), pd.DataFrame(spin_data)],
            ignore_index=True,
        )

    def test_rolling_variance(self):
        constant_series = pd.Series([1.0] * 20)
        var = rolling_variance(constant_series, window=5)
        self.assertEqual(len(var), 20)
        self.assertTrue(np.allclose(var, 0.0))

        noisy_series = pd.Series(np.random.normal(0, 1.0, 30))
        noisy_var = rolling_variance(noisy_series, window=5)
        self.assertTrue((noisy_var[5:] > 0).all())

    def test_calibrate_thresholds(self):
        thresholds = calibrate_thresholds(self.df)
        self.assertIn("idle_current_max", thresholds)
        self.assertIn("washing_to_spinning_var", thresholds)
        self.assertGreater(thresholds["idle_current_max"], 0.0)
        self.assertGreater(thresholds["washing_to_spinning_var"], 0.0)
        self.assertGreater(
            thresholds["washing_to_spinning_var"],
            thresholds["idle_to_washing_var"],
        )

    def test_classify_stream_and_debounce(self):
        thresholds = calibrate_thresholds(self.df)
        classified = classify_stream(self.df, thresholds, debounce_n=3)

        self.assertIn("predicted_state_raw", classified.columns)
        self.assertIn("accel_mag", classified.columns)
        self.assertIn("accel_var", classified.columns)

        # Check that idle section predominantly predicted idle_or_done
        idle_preds = classified.iloc[:40]["predicted_state_raw"]
        self.assertIn("idle_or_done", idle_preds.values)

        # Check that spinning section predominantly predicted spinning
        spin_preds = classified.iloc[-30:]["predicted_state_raw"]
        self.assertIn("spinning", spin_preds.values)

    def test_evaluate_accuracy(self):
        thresholds = calibrate_thresholds(self.df)
        classified = classify_stream(self.df, thresholds, debounce_n=3)
        accuracy, scored = evaluate(classified)

        self.assertIn("predicted_state", scored.columns)
        self.assertGreater(accuracy, 0.70)  # Should achieve high accuracy on synthetic cycle


if __name__ == "__main__":
    unittest.main()
