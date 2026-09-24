import os
import sys
import unittest
import pandas as pd

sim_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if sim_dir not in sys.path:
    sys.path.insert(0, sim_dir)

import fault_tolerance


class TestFaultTolerance(unittest.TestCase):
    def setUp(self):
        self.state_file = os.path.join(sim_dir, "last_known_state.json")

    def tearDown(self):
        if os.path.exists(self.state_file):
            try:
                os.remove(self.state_file)
            except OSError:
                pass

    def test_save_and_resume_state(self):
        fault_tolerance.save_state(timestamp=12345.67, state="washing", cycle_id="test_001")
        recovered = fault_tolerance.resume_state()

        self.assertIsNotNone(recovered)
        self.assertEqual(recovered["state"], "washing")
        self.assertEqual(recovered["timestamp"], 12345.67)
        self.assertEqual(recovered["cycle_id"], "test_001")

    def test_simulate_power_loss(self):
        df = pd.DataFrame({
            "t": [1.0, 2.0, 3.0, 4.0, 5.0],
            "true_state": ["idle", "washing", "washing", "spinning", "idle"],
        })

        before, after, recovered = fault_tolerance.simulate_power_loss(df, cutoff_index=3)

        self.assertEqual(len(before), 3)
        self.assertEqual(len(after), 2)
        self.assertEqual(recovered["state"], "washing")
        self.assertEqual(recovered["timestamp"], 3.0)

    def test_simulate_watchdog_hang(self):
        # Default behavior should detect a hang with the simulated stale heartbeat
        hung = fault_tolerance.simulate_watchdog_hang(max_hang_seconds=5)
        self.assertTrue(hung)


if __name__ == "__main__":
    unittest.main()
