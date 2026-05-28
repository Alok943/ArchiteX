import asyncio
import json
import time
import csv
from datetime import datetime
from pathlib import Path
import httpx

BASE_URL = "http://localhost:8000/api/v1"
RESULTS_DIR = Path("results")
RESULTS_DIR.mkdir(exist_ok=True)


# ─────────────────────────────────────────
# DATASET
# ─────────────────────────────────────────

REAL_PROMPTS = [
    {"id": "R01", "prompt": "Build a CRM with login, contacts, dashboard, role-based access, and premium plan with payments. Admins can see analytics."},
    {"id": "R02", "prompt": "E-commerce platform with product catalog, cart, checkout, order tracking, and admin panel."},
    {"id": "R03", "prompt": "SaaS analytics dashboard with team workspaces, usage metrics, and billing management."},
    {"id": "R04", "prompt": "Blog platform with author, editor, and reader roles. Authors write drafts, editors publish."},
    {"id": "R05", "prompt": "Job board where employers post jobs and applicants apply. Premium employers get featured listings."},
    {"id": "R06", "prompt": "Booking system for a salon — clients book appointments, staff manage schedules, admin sees reports."},
    {"id": "R07", "prompt": "LMS with courses, video modules, quizzes, and student progress tracking. Instructors manage content."},
    {"id": "R08", "prompt": "Inventory management with suppliers, stock levels, purchase orders, and low-stock alerts."},
    {"id": "R09", "prompt": "Social app with user profiles, posts, follow system, feed, likes, and direct messages."},
    {"id": "R10", "prompt": "Project management tool with tasks, sprints, team members, comments, and Gantt chart view."},
]

EDGE_CASES = [
    {"id": "E01", "prompt": "build me something for my business"},
    {"id": "E02", "prompt": "I want a public dashboard that only admins can see and everyone can access."},
    {"id": "E03", "prompt": "user login"},
    {"id": "E04", "prompt": "Build an app with user auth, social login, profiles, posts, stories, reels, live streaming, marketplace, payments, analytics, admin panel, moderation, AI recommendations, notifications, and search."},
    {"id": "E05", "prompt": "Every user should be an admin with full access to everything."},
    {"id": "E06", "prompt": "A simple todo app, no login needed, just tasks."},
    {"id": "E07", "prompt": "Help me manage my stuff."},
    {"id": "E08", "prompt": "Build a CRM that is also a social network with payments and an AI chatbot and blockchain integration."},
    {"id": "E09", "prompt": "Something like Notion but for cooking recipes and meal planning."},
    {"id": "E10", "prompt": "Build a fitness tracker app."},
]

ALL_PROMPTS = REAL_PROMPTS + EDGE_CASES


# ─────────────────────────────────────────
# RUNNER
# ─────────────────────────────────────────

async def run_single(client: httpx.AsyncClient, entry: dict) -> dict:
    prompt_id = entry["id"]
    prompt_type = "REAL" if prompt_id.startswith("R") else "EDGE"
    start = time.time()

    try:
        response = await client.post(
            f"{BASE_URL}/generate",
            json={"prompt": entry["prompt"]},
            timeout=180.0,
        )
        latency_ms = int((time.time() - start) * 1000)

        if response.status_code == 200:
            data = response.json()
            retry_count = data.get("retry_count", 0)
            has_errors = len(data.get("validation_errors", [])) > 0
            success = not has_errors

            return {
                "prompt_id": prompt_id,
                "type": prompt_type,
                "success": "Pass" if success else "Fail",
                "retries": retry_count,
                "latency_ms": latency_ms,
                "status_code": 200,
                "error": "",
            }

        elif response.status_code == 422:
            # Clarification needed — not a failure, expected for vague prompts
            return {
                "prompt_id": prompt_id,
                "type": prompt_type,
                "success": "Clarification",
                "retries": 0,
                "latency_ms": latency_ms,
                "status_code": 422,
                "error": "Clarification needed",
            }

        else:
            return {
                "prompt_id": prompt_id,
                "type": prompt_type,
                "success": "Fail",
                "retries": 0,
                "latency_ms": latency_ms,
                "status_code": response.status_code,
                "error": response.text[:200],
            }

    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return {
            "prompt_id": prompt_id,
            "type": prompt_type,
            "success": "Fail",
            "retries": 0,
            "latency_ms": latency_ms,
            "status_code": 0,
            "error": str(e)[:200],
        }


async def run_all():
    print(f"Starting evaluation — {len(ALL_PROMPTS)} prompts\n")
    results = []

    async with httpx.AsyncClient() as client:
        for entry in ALL_PROMPTS:
            print(f"Running {entry['id']}...", end=" ", flush=True)
            result = await run_single(client, entry)
            results.append(result)
            print(f"{result['success']} ({result['latency_ms']}ms, {result['retries']} retries)")
            await asyncio.sleep(6)

    return results


# ─────────────────────────────────────────
# METRICS + CSV
# ─────────────────────────────────────────

def compute_metrics(results: list[dict]) -> dict:
    total = len(results)
    passed = sum(1 for r in results if r["success"] == "Pass")
    failed = sum(1 for r in results if r["success"] == "Fail")
    clarification = sum(1 for r in results if r["success"] == "Clarification")

    latencies = [r["latency_ms"] for r in results if r["latency_ms"] > 0]
    retries = [r["retries"] for r in results]

    latencies_sorted = sorted(latencies)
    p95_index = int(len(latencies_sorted) * 0.95)

    return {
        "total": total,
        "passed": passed,
        "failed": failed,
        "clarification": clarification,
        "success_rate": f"{(passed / total) * 100:.1f}%",
        "avg_retries": f"{sum(retries) / total:.2f}",
        "avg_latency_ms": f"{sum(latencies) / len(latencies):.0f}ms",
        "p95_latency_ms": f"{latencies_sorted[p95_index]}ms",
    }


def save_results(results: list[dict]):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = RESULTS_DIR / f"benchmark_{timestamp}.csv"

    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

    print(f"\nResults saved → {csv_path}")
    return csv_path


def print_summary(metrics: dict):
    print("\n" + "=" * 45)
    print("EVALUATION SUMMARY")
    print("=" * 45)
    for key, val in metrics.items():
        print(f"  {key:<20} {val}")
    print("=" * 45)


# ─────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────

if __name__ == "__main__":
    results = asyncio.run(run_all())
    metrics = compute_metrics(results)
    save_results(results)
    print_summary(metrics)