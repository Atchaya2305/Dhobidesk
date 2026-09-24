#!/usr/bin/env python3
"""DhobiDesk Multi-Machine Simulation CLI.

Simulates N laundry machines reporting telemetry over MQTT with configurable
speedup and fault injection (power cut, stale data).
"""

import argparse
import json
import os
from pathlib import Path
import ssl
import sys
import threading
import time

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    from dotenv import load_dotenv

    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()
except ImportError:
    pass

import paho.mqtt.client as mqtt
import pandas as pd


def get_default_csv():
    candidates = [
        Path(__file__).resolve().parent.parent / "data" / "classified_top_load.csv",
        Path(__file__).resolve().parent / "data" / "classified_top_load.csv",
        Path("data/classified_top_load.csv"),
        Path("../data/classified_top_load.csv"),
    ]
    for c in candidates:
        if c.exists():
            return str(c)
    return None


def create_mqtt_client(broker, port, username, password):
    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    except (AttributeError, TypeError):
        client = mqtt.Client()
    client.username_pw_set(username, password)
    client.tls_set(tls_version=ssl.PROTOCOL_TLS)
    client.connect(broker, port)
    client.loop_start()
    return client


def extract_cycle_transitions(csv_path):
    if csv_path and os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        col = "predicted_state" if "predicted_state" in df.columns else ("true_state" if "true_state" in df.columns else "state")
        transitions = []
        last_s = None
        last_t = 0.0

        for _, row in df.iterrows():
            s = row[col]
            t = float(row["t"]) if "t" in row else len(transitions) * 2.0
            if s != last_s:
                duration = max(1.0, t - last_t) if last_s is not None else 1.0
                transitions.append((s, duration))
                last_s = s
                last_t = t
        if transitions:
            # Ensure cycle ends cleanly with done -> idle
            if transitions[-1][0] != "idle":
                transitions.append(("done", 8.0))
                transitions.append(("idle", 4.0))
            return transitions

    # Fallback synthetic realistic cycle (durations in simulated seconds)
    return [
        ("idle", 3.0),
        ("washing", 25.0),
        ("spinning", 15.0),
        ("done", 10.0),
        ("idle", 5.0),
    ]


def publish_machine_state(client, machine_id, state, extra=None):
    payload = {
        "machine_id": machine_id,
        "state": state,
        "timestamp": time.time(),
    }
    if extra:
        payload.update(extra)
    topic = f"dhobidesk/machines/{machine_id}/state"
    client.publish(topic, json.dumps(payload), qos=1)
    ts_str = time.strftime("%H:%M:%S")
    print(f"[{ts_str}] [{machine_id}] State -> {state.upper()}")


def simulate_machine(
    machine_id,
    transitions,
    client,
    speedup=5.0,
    fault="none",
    loop=False,
    start_delay=0.0,
    stop_event=None,
):
    if start_delay > 0:
        time.sleep(start_delay)

    iteration = 1
    total_steps = len(transitions)

    while not (stop_event and stop_event.is_set()):
        print(f"\n--- [{machine_id}] Starting cycle run #{iteration} (Speedup: {speedup}x, Fault: {fault}) ---")
        fault_triggered = False

        for idx, (state, duration) in enumerate(transitions):
            if stop_event and stop_event.is_set():
                break

            # Check fault injection
            if fault == "power_cut" and not fault_triggered and idx >= total_steps // 2:
                fault_triggered = True
                print(f"[FAULT: POWER_CUT] Simulating POWER CUT on {machine_id}!")
                publish_machine_state(client, machine_id, "offline", {"fault": "simulated_power_cut"})
                pause_time = 10.0 / max(1.0, (speedup / 2.0))
                print(f"[POWER_LOST] [{machine_id}] Machine offline for {pause_time:.1f}s...")
                time.sleep(pause_time)
                print(f"[POWER_RESTORED] Power restored on {machine_id}! Resuming cycle...")

            elif fault == "stale_data" and idx >= 2:
                print(f"[FAULT: STALE_DATA] Simulating STALE DATA on {machine_id} (halting MQTT transmission).")
                print(f"[WATCHDOG] Bridge watchdog will detect inactivity and flag offline after 90s.")
                return

            publish_machine_state(client, machine_id, state)
            scaled_sleep = max(0.2, duration / speedup)
            time.sleep(scaled_sleep)

        if not loop or (stop_event and stop_event.is_set()):
            print(f"[DONE] [{machine_id}] Cycle completed.")
            break

        iteration += 1
        time.sleep(2.0)


def main():
    parser = argparse.ArgumentParser(
        description="DhobiDesk Multi-Machine Telemetry Simulator CLI",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "-n",
        "--machines",
        type=int,
        default=1,
        help="Number of concurrent machines to simulate (e.g. 1 to 5)",
    )
    parser.add_argument(
        "--machine-id",
        type=str,
        default=None,
        help="Specific machine ID if simulating a single custom machine (e.g. machine_01)",
    )
    parser.add_argument(
        "-s",
        "--speedup",
        type=float,
        default=5.0,
        help="Speedup multiplier for state transitions (e.g. 1.0 = real-time, 10.0 = fast)",
    )
    parser.add_argument(
        "--fault",
        choices=["none", "power_cut", "stale_data"],
        default="none",
        help="Fault injection mode: 'power_cut' (temporary outage), 'stale_data' (abandon telemetry), or 'none'",
    )
    parser.add_argument(
        "--loop",
        action="store_true",
        help="Continuously repeat the wash cycle",
    )
    parser.add_argument(
        "--csv",
        type=str,
        default=get_default_csv(),
        help="Path to classified sensor CSV dataset",
    )
    parser.add_argument(
        "--broker",
        type=str,
        default=os.getenv("HIVEMQ_BROKER") or os.getenv("HIVEMQ_HOST"),
        help="MQTT broker hostname",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("HIVEMQ_PORT", 8883)),
        help="MQTT broker TLS port",
    )
    parser.add_argument(
        "--username",
        type=str,
        default=os.getenv("HIVEMQ_USERNAME"),
        help="MQTT username",
    )
    parser.add_argument(
        "--password",
        type=str,
        default=os.getenv("HIVEMQ_PASSWORD"),
        help="MQTT password",
    )

    args = parser.parse_args()

    if not args.broker or not args.username or not args.password:
        print("Error: Missing MQTT credentials. Set HIVEMQ_BROKER, HIVEMQ_USERNAME, HIVEMQ_PASSWORD in simulation/.env or pass as arguments.")
        sys.exit(1)

    print("==================================================")
    print(" DhobiDesk Multi-Machine Telemetry Simulator CLI")
    print("==================================================")
    print(f"Broker:    {args.broker}:{args.port}")
    print(f"Speedup:   {args.speedup}x")
    print(f"Fault:     {args.fault}")
    print(f"Loop:      {args.loop}")
    print(f"Dataset:   {args.csv or 'Synthetic generated'}")

    transitions = extract_cycle_transitions(args.csv)
    print(f"Extracted {len(transitions)} state transition stages.")

    print(f"Connecting to MQTT broker...")
    client = create_mqtt_client(args.broker, args.port, args.username, args.password)
    time.sleep(1.0)
    print("Connected to HiveMQ successfully.\n")

    # Generate machine IDs
    if args.machine_id:
        machine_ids = [args.machine_id]
    else:
        machine_ids = [f"machine_{str(i + 1).zfill(2)}" for i in range(args.machines)]

    stop_event = threading.Event()
    threads = []

    try:
        for idx, mid in enumerate(machine_ids):
            # Stagger start times slightly if multiple machines
            delay = idx * 2.0
            t = threading.Thread(
                target=simulate_machine,
                args=(mid, transitions, client),
                kwargs={
                    "speedup": args.speedup,
                    "fault": args.fault,
                    "loop": args.loop,
                    "start_delay": delay,
                    "stop_event": stop_event,
                },
                daemon=True,
            )
            threads.append(t)
            t.start()

        for t in threads:
            while t.is_alive():
                t.join(timeout=0.5)

        print("\nAll machine simulations finished.")

    except KeyboardInterrupt:
        print("\n[Simulator] Interrupted by user (Ctrl+C). Stopping all machines...")
        stop_event.set()
    finally:
        time.sleep(0.5)
        client.loop_stop()
        client.disconnect()
        print("[Simulator] Disconnected from MQTT broker. Goodbye.")


if __name__ == "__main__":
    main()
