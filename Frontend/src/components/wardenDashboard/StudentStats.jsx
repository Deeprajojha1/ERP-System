import React from "react";
import { Users, MapPin, Clock, AlertCircle, CreditCard } from "lucide-react";

function StudentStats({ stats }) {
  const statCards = [
    {
      id: "total",
      title: "Total Students",
      value: stats.total,
      icon: Users,
      color: "blue",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      id: "outside",
      title: "Currently Outside",
      value: stats.outside,
      icon: MapPin,
      color: "emerald",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      id: "overdue",
      title: "Overdue Returns",
      value: stats.overdue,
      icon: Clock,
      color: "amber",
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      id: "complaints",
      title: "Pending Complaints",
      value: stats.complaints,
      icon: AlertCircle,
      color: "rose",
      bgColor: "bg-rose-50",
      iconColor: "text-rose-600",
    },
    {
      id: "feeDue",
      title: "Fee Due",
      value: stats.feeDue,
      icon: CreditCard,
      color: "violet",
      bgColor: "bg-violet-50",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <section aria-label="Students Summary Statistics" className="mb-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`${card.bgColor} rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-md hover:border-gray-300`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`rounded-lg ${card.bgColor} p-3`}>
                  <Icon className={`h-6 w-6 ${card.iconColor}`} aria-hidden="true" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default StudentStats;
