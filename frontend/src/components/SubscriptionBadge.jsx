// src/components/SubscriptionBadge.jsx
import React from "react";
import { Clock, AlertTriangle, CheckCircle, XCircle, Calendar } from "lucide-react";

export default function SubscriptionBadge({ subscription }) {
  if (!subscription) return null;

  const { daysRemaining, status, endDate } = subscription;

  if (status === "expired" || status === "no_subscription") {
    return (
      <div className="mx-3 mb-2 rounded-xl border-2 border-red-300/60 dark:border-red-700/40 bg-red-50 dark:bg-red-900/20 p-3">
        <div className="flex items-center gap-2 mb-1">
          <XCircle size={14} className="text-red-500 flex-shrink-0" />
          <span className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">
            Subscription Expired
          </span>
        </div>
        <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
          Contact administrator to renew.
        </p>
      </div>
    );
  }

  const getConfig = () => {
    if (daysRemaining <= 3) return {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-300/60 dark:border-red-700/40",
      text: "text-red-700 dark:text-red-300",
      subtext: "text-red-600 dark:text-red-400",
      bar: "from-red-500 to-red-600",
      Icon: AlertTriangle,
      label: "Critical"
    };
    if (daysRemaining <= 7) return {
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-orange-300/60 dark:border-orange-700/40",
      text: "text-orange-700 dark:text-orange-300",
      subtext: "text-orange-600 dark:text-orange-400",
      bar: "from-orange-500 to-amber-500",
      Icon: AlertTriangle,
      label: "Expiring Soon"
    };
    if (daysRemaining <= 30) return {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-300/60 dark:border-amber-700/40",
      text: "text-amber-700 dark:text-amber-300",
      subtext: "text-amber-600 dark:text-amber-400",
      bar: "from-amber-500 to-yellow-500",
      Icon: Clock,
      label: "Active"
    };
    return {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-300/60 dark:border-green-700/40",
      text: "text-green-700 dark:text-green-300",
      subtext: "text-green-600 dark:text-green-400",
      bar: "from-green-500 to-emerald-500",
      Icon: CheckCircle,
      label: "Active"
    };
  };

  const config = getConfig();
  const { Icon } = config;

  // Progress bar: cap at 90 days for visual purposes
  const progressPct = Math.min(100, Math.round((daysRemaining / 90) * 100));

  const formattedEnd = endDate
    ? new Date(endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <div className={`mx-3 mb-2 rounded-xl border-2 ${config.border} ${config.bg} p-3 space-y-2`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={13} className={config.text} />
          <span className={`text-xs font-bold uppercase tracking-wide ${config.text}`}>
            Subscription
          </span>
        </div>
        <span className={`text-xs font-semibold ${config.text}`}>
          {config.label}
        </span>
      </div>

      {/* Days remaining */}
      <div className="text-center">
        <span className={`text-2xl font-black ${config.text} tabular-nums`}>
          {daysRemaining}
        </span>
        <span className={`text-xs font-medium ${config.subtext} ml-1`}>
          day{daysRemaining !== 1 ? "s" : ""} left
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${config.bar} rounded-full transition-all duration-700`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* End date */}
      {formattedEnd && (
        <div className={`flex items-center gap-1 text-xs ${config.subtext}`}>
          <Calendar size={10} />
          <span>Expires {formattedEnd}</span>
        </div>
      )}
    </div>
  );
}