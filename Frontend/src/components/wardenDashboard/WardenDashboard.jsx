import { useMemo, useState } from "react";
import { BellRing, CircleAlert } from "lucide-react";
import AlertItem from "./AlertItem";
import ChartCard from "./ChartCard";
import Sidebar from "./Sidebar";
import StatCard from "./StatCard";
import TopNavbar from "./TopNavbar";
import {
  alertItems,
  complaintStatusData,
  emergencyNotice,
  profile,
  roomOccupancyData,
  sidebarItems,
  statCards,
  weeklyTrendData,
} from "./mockData";

function WardenDashboard() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  const EmergencyIcon = emergencyNotice.icon || CircleAlert;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fbff] via-[#eef4ff] to-[#f4f7fb] text-gray-900">
      <div className="flex">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
          items={sidebarItems}
        />

        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-black/35"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            />
            <div className="relative h-full w-72 border-r border-gray-200 bg-white p-4 shadow-xl">
              <Sidebar
                isCollapsed={false}
                onToggle={() => setIsMobileSidebarOpen(false)}
                items={sidebarItems}
                mobile
              />
            </div>
          </div>
        )}

        <div className="min-h-screen flex-1">
          <TopNavbar
            currentDate={currentDate}
            profile={profile}
            onMobileMenuToggle={() => setIsMobileSidebarOpen((prev) => !prev)}
          />

          <main className="p-6">
            <section aria-label="Dashboard Overview" className="space-y-6">
              <header>
                <h2 className="text-lg font-semibold text-gray-900">Dashboard Overview</h2>
                <p className="text-sm text-gray-600">
                  Real-time hostel operations snapshot for warden control room.
                </p>
              </header>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {statCards.map((card) => (
                  <StatCard key={card.id} {...card} />
                ))}
              </div>
            </section>

            <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-8">
                <ChartCard
                  title="Complaint Status Pie Chart"
                  subtitle="Distribution of complaint outcomes this week"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="grid h-40 w-40 place-content-center rounded-full border-8 border-blue-100 bg-blue-50 text-sm text-gray-600">
                      Pie Placeholder
                    </div>
                    <ul className="space-y-2">
                      {complaintStatusData.map((item) => (
                        <li key={item.label} className="flex items-center justify-between gap-8">
                          <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} aria-hidden="true" />
                            {item.label}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {item.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ChartCard>

                <ChartCard title="Room Occupancy Bar Chart" subtitle="Block-wise occupied capacity">
                  <div className="space-y-3">
                    {roomOccupancyData.map((item) => (
                      <div key={item.block}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Block {item.block}</span>
                          <span className="text-gray-600">
                            {item.occupied}/{item.total}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200">
                          <div className={`h-2 rounded-full bg-blue-500 ${item.widthClass}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </ChartCard>

                <ChartCard title="Weekly Exit/Entry Trend Line Chart" subtitle="Student movement trends over 7 days">
                  <div className="h-48 rounded-xl border border-dashed border-gray-300 bg-blue-50/40 p-4">
                    <div className="grid h-full grid-cols-7 items-end gap-2">
                      {weeklyTrendData.map((item) => (
                        <div key={item.day} className="flex flex-col items-center gap-2">
                          <div className="flex h-32 items-end gap-1">
                            <span className={`w-2 rounded-t bg-blue-500 ${item.entryBarClass}`} />
                            <span className={`w-2 rounded-t bg-green-500 ${item.exitBarClass}`} />
                          </div>
                          <span className="text-xs text-gray-600">{item.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>
              </div>

              <aside className="space-y-6 xl:col-span-4">
                <section
                  aria-label="Emergency Notice"
                  className="rounded-2xl border border-red-200 bg-red-50 p-5"
                >
                  <div className="flex items-start gap-3">
                    <EmergencyIcon className="mt-0.5 h-5 w-5 text-red-700" />
                    <div>
                      <h3 className="text-sm font-semibold text-red-800">
                        {emergencyNotice.title}
                      </h3>
                      <p className="mt-1 text-sm text-red-700">{emergencyNotice.message}</p>
                    </div>
                  </div>
                </section>

                <section
                  aria-label="Critical Alerts"
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <header className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">Critical Alerts</h3>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600">
                      <BellRing className="h-4 w-4" />
                      Live
                    </span>
                  </header>
                  <ul className="space-y-3">
                    {alertItems.map((item) => (
                      <AlertItem key={item.id} item={item} />
                    ))}
                  </ul>
                </section>
              </aside>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default WardenDashboard;
