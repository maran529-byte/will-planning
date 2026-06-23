#!/usr/bin/env python3
"""
GA4 Measurement Protocol 服务端事件上报
用于 Agent 拉取数据时验证 API + 关键事件追踪
"""
import json
import os
import time
import urllib.request
import urllib.parse
from typing import Optional, Dict, Any

MEASUREMENT_ID = os.environ.get("GA4_MEASUREMENT_ID", "G-9XQ3Q29SEK")
API_SECRET = os.environ.get("GA4_API_SECRET", "")

ENDPOINT = "https://www.google-analytics.com/mp/collect"


def send_event(
    client_id: str,
    event_name: str,
    params: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    debug: bool = False,
) -> bool:
    """
    发送事件到 GA4 Measurement Protocol
    Returns: True on success (204), False on failure
    """
    if not API_SECRET:
        print("[GA4] API_SECRET not set, skip")
        return False

    payload: Dict[str, Any] = {
        "client_id": client_id,
        "events": [
            {
                "name": event_name,
                "params": params or {},
            }
        ],
    }
    if user_id:
        payload["user_id"] = user_id

    qs = urllib.parse.urlencode({
        "measurement_id": MEASUREMENT_ID,
        "api_secret": API_SECRET,
    })
    url = f"{ENDPOINT}?{qs}"
    if debug:
        url += "&debug=1"

    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            code = r.status
            if code == 204:
                print(f"[GA4] OK event={event_name} client={client_id[:16]}")
                return True
            else:
                print(f"[GA4] FAIL status={code} event={event_name}")
                return False
    except Exception as e:
        print(f"[GA4] ERR event={event_name}: {e}")
        return False


def agent_daily_run(agent_id: str = "agent_master", date_str: str = "") -> bool:
    """
    Agent 每日运行事件
    """
    return send_event(
        client_id=f"agent.{agent_id}.{date_str or time.strftime('%Y%m%d')}",
        event_name="agent_daily_run",
        params={
            "agent_id": agent_id,
            "date": date_str or time.strftime("%Y-%m-%d"),
            "engagement_time_msec": 100,
        },
    )


def geo_evaluation(engines: list, score: float) -> bool:
    """
    GEO 评分事件
    """
    return send_event(
        client_id=f"geo.{time.strftime('%Y%m%d')}",
        event_name="geo_evaluation",
        params={
            "engines": ",".join(engines),
            "score": score,
            "engagement_time_msec": 50,
        },
    )


def order_event(order_id: str, amount: float, doc_type: str) -> bool:
    """
    订单事件
    """
    return send_event(
        client_id=f"order.{order_id}",
        event_name="purchase",
        params={
            "transaction_id": order_id,
            "value": amount,
            "currency": "CNY",
            "items": [{"item_name": doc_type, "price": amount}],
        },
    )


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python ga4_measurement.py test")
        print("  python ga4_measurement.py agent [agent_id] [date]")
        print("  python ga4_measurement.py geo [engines_csv] [score]")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "test":
        ok = send_event(
            client_id="test.client.001",
            event_name="test_event",
            params={"test_param": "agent_smoke_test"},
            debug=True,
        )
        sys.exit(0 if ok else 1)
    elif cmd == "agent":
        agent_id = sys.argv[2] if len(sys.argv) > 2 else "agent_master"
        date_str = sys.argv[3] if len(sys.argv) > 3 else ""
        ok = agent_daily_run(agent_id, date_str)
        sys.exit(0 if ok else 1)
    elif cmd == "geo":
        engines = sys.argv[2].split(",") if len(sys.argv) > 2 else ["deepseek"]
        score = float(sys.argv[3]) if len(sys.argv) > 3 else 0
        ok = geo_evaluation(engines, score)
        sys.exit(0 if ok else 1)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
