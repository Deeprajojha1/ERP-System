import { Bell, ChevronDown, Menu } from "lucide-react";

function TopNavbar({ currentDate, profile, onMobileMenuToggle }) {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-gradient-to-r from-[#f8fbff] via-[#eef5ff] to-[#f6fbff] px-6 py-4 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="rounded-lg border border-gray-200 p-2 text-gray-600 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Warden Dashboard</h1>
            <p className="text-sm text-gray-600">{currentDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative rounded-xl border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-blue-50"
            aria-label="Open notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-left transition-colors hover:bg-blue-50"
            aria-label="Open profile menu"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              PM
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold text-gray-900">
                {profile.name}
              </span>
              <span className="block text-xs text-gray-600">{profile.role}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopNavbar;
