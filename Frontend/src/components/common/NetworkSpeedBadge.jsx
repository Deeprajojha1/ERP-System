import { useEffect, useState } from "react";
import { FiWifi, FiWifiOff } from "react-icons/fi";
import { useSelector } from "react-redux";
import "./NetworkSpeedBadge.css";

const getConnection = () => {
  if (typeof navigator === "undefined") return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
};

const formatSpeed = (mbps) => {
  if (typeof mbps !== "number" || Number.isNaN(mbps)) return "Checking...";
  return mbps < 1 ? `${Math.round(mbps * 1000)} Kbps` : `${mbps.toFixed(1)} Mbps`;
};

const estimateFromEffectiveType = (effectiveType) => {
  const type = (effectiveType || "").toLowerCase();
  if (type === "slow-2g") return 0.05;
  if (type === "2g") return 0.25;
  if (type === "3g") return 0.7;
  if (type === "4g") return 9;
  return null;
};

const measureNetworkSpeed = async () => {
  if (typeof window === "undefined" || typeof performance === "undefined") {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  const testUrl = `${window.location.origin}/favicon.ico?cb=${Date.now()}`;

  try {
    const start = performance.now();
    const response = await fetch(testUrl, {
      cache: "no-store",
      signal: controller.signal,
    });
    const blob = await response.blob();
    const durationSec = (performance.now() - start) / 1000;

    if (durationSec <= 0 || !blob.size) return null;
    return (blob.size * 8) / (durationSec * 1000000);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const canReachServer = async (apiBase) => {
  if (!apiBase) return true;

  let origin;
  try {
    origin = new URL(String(apiBase)).origin;
  } catch {
    return true;
  }

  const pingUrl = `${origin}/?ping=${Date.now()}`;
  try {
    await fetch(pingUrl, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
    });
    return true;
  } catch {
    return false;
  }
};

const getNetworkSnapshot = (fallbackMbps = null, serverReachable = true) => {
  if (typeof navigator === "undefined") {
    return { label: "Measuring...", quality: "fair" };
  }

  if (!navigator.onLine || serverReachable === false) {
    return { label: "Offline", quality: "offline" };
  }

  const connection = getConnection();
  const downlink =
    typeof connection?.downlink === "number" ? connection.downlink : null;
  const effectiveType = connection?.effectiveType || "";
  const estimatedMbps = estimateFromEffectiveType(effectiveType);
  const speedMbps = fallbackMbps ?? downlink ?? estimatedMbps;
  const effectiveTypeLabel = effectiveType ? effectiveType.toUpperCase() : "";

  let quality = "good";
  if (
    effectiveTypeLabel.includes("2G") ||
    effectiveTypeLabel.includes("SLOW-2G") ||
    (typeof speedMbps === "number" && speedMbps < 1.5)
  ) {
    quality = "poor";
  } else if (
    effectiveTypeLabel.includes("3G") ||
    (typeof speedMbps === "number" && speedMbps < 5)
  ) {
    quality = "fair";
  }

  const label = formatSpeed(speedMbps);

  return { label, quality };
};

function NetworkSpeedBadge() {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [fallbackMbps, setFallbackMbps] = useState(null);
  const [serverReachable, setServerReachable] = useState(true);
  const [, setRefreshKey] = useState(0);
  const networkInfo = getNetworkSnapshot(fallbackMbps, serverReachable);

  useEffect(() => {
    const updateNetwork = () => setRefreshKey((prev) => prev + 1);
    const connection = getConnection();
    const handleNetworkEvent = () => {
      updateNetwork();
      runSpeedCheck();
    };

    const runSpeedCheck = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setFallbackMbps(null);
        setServerReachable(false);
        return;
      }

      const reachable = await canReachServer(apiBase);
      setServerReachable(reachable);
      if (!reachable) return;

      const measured = await measureNetworkSpeed();
      if (typeof measured === "number") {
        setFallbackMbps(measured);
      }
    };

    window.addEventListener("online", handleNetworkEvent);
    window.addEventListener("offline", handleNetworkEvent);
    connection?.addEventListener?.("change", handleNetworkEvent);

    runSpeedCheck();

    return () => {
      window.removeEventListener("online", handleNetworkEvent);
      window.removeEventListener("offline", handleNetworkEvent);
      connection?.removeEventListener?.("change", handleNetworkEvent);
    };
  }, [apiBase]);

  return (
    <span className={`net-speed-badge ${networkInfo.quality}`}>
      {networkInfo.quality === "offline" ? (
        <FiWifiOff className="net-speed-icon" aria-hidden="true" />
      ) : (
        <FiWifi className="net-speed-icon" aria-hidden="true" />
      )}
      Net: {networkInfo.label}
    </span>
  );
}

export default NetworkSpeedBadge;
