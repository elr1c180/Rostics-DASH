import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
} from "recharts";
import {
  ChevronDown,
  Store,
  CalendarDays,
  Clock3,
  Building2,
  Search,
  X,
  Menu,
  SlidersHorizontal,
} from "lucide-react";

const COLORS = {
  page: "#F7F6F2",
  card: "#FFFFFF",
  border: "rgba(15, 23, 42, 0.08)",
  text: "#101827",
  muted: "#6B7280",
  red: "#E30613",
  orange: "#FF7A00",
  yellow: "#F5A400",
  green: "#128A43",
  blue: "#2563EB",
  grid: "#ECECEC",
};

const BRANDS = {
  rostics: { name: "Ростик’с", short: "R", color: COLORS.red, bg: "#FFF1F1" },
  tasty: { name: "Вкусно — и точка", short: "ВиТ", color: COLORS.orange, bg: "#FFF4E8" },
  bk: { name: "Бургер Кинг", short: "BK", color: COLORS.yellow, bg: "#FFF7DC" },
};

const brandKeys = Object.keys(BRANDS);
const months = ["декабрь 2023", "январь 2024", "февраль 2024", "март 2024", "апрель 2024", "май 2024"];
const monthShort = ["дек", "янв", "фев", "мар", "апр", "май"];
const periods = ["Все периоды", "Будни", "Выходные"];
const slots = ["Все слоты", "Утро", "Час-пик", "Вечер"];

const restaurants = Array.from({ length: 30 }, (_, i) => {
  const brand = brandKeys[i % 3];
  const city = ["Москва", "СПб", "Казань", "Екатеринбург", "Новосибирск", "Самара"][i % 6];
  const district = ["Центр", "Север", "Юг", "Запад", "Восток"][i % 5];
  return {
    id: i + 1,
    name: `${BRANDS[brand].name} ${city} ${district} #${String(i + 1).padStart(2, "0")}`,
    brand,
    city,
    type: i % 2 === 0 ? "Фудкорт" : "Отдельный ресторан",
  };
});

function hashScore(seed, min, max) {
  const x = Math.sin(seed * 999) * 10000;
  return Number((min + (x - Math.floor(x)) * (max - min)).toFixed(1));
}

const records = restaurants.flatMap((restaurant) => {
  return months.flatMap((month, monthIndex) => {
    return [1, 2, 3, 4].flatMap((week) => {
      return ["Будни", "Выходные"].flatMap((period) => {
        return ["Утро", "Час-пик", "Вечер"].map((slot, slotIndex) => {
          const brandBase = restaurant.brand === "rostics" ? 89 : restaurant.brand === "tasty" ? 84 : 81;
          const monthBoost = monthIndex * 0.9;
          const periodPenalty = period === "Выходные" ? -1.7 : 0;
          const slotPenalty = slot === "Час-пик" ? -2.3 : slot === "Вечер" ? -1.1 : 1.2;
          const noise = hashScore(restaurant.id * 10 + monthIndex * 3 + week + slotIndex, -2.2, 2.2);
          const cleanliness = Math.max(55, Math.min(99, brandBase + monthBoost + periodPenalty + slotPenalty + noise));
          const survey = Math.max(42, Math.min(96, cleanliness - hashScore(restaurant.id + week + slotIndex, 9, 17)));
          const checks = Math.round(hashScore(restaurant.id + monthIndex + week + slotIndex, 8, 34));
          return {
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            brand: restaurant.brand,
            city: restaurant.city,
            type: restaurant.type,
            month,
            monthShort: monthShort[monthIndex],
            week: `${week} нед`,
            period,
            slot,
            cleanliness,
            survey,
            checks,
            hall: Math.min(99, cleanliness + hashScore(restaurant.id + week, -1, 3)),
            wc: Math.max(50, cleanliness + hashScore(restaurant.id + slotIndex, -7, 1)),
            kitchen: Math.min(99, cleanliness + hashScore(restaurant.id + monthIndex, 0, 4)),
            facade: Math.max(50, cleanliness + hashScore(restaurant.id + week + monthIndex, -5, 2)),
          };
        });
      });
    });
  });
});

function avg(values) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1));
}

function formatPct(v) {
  return `${Number(v || 0).toFixed(1)}%`;
}

function LogoBadge({ brand, size = "normal" }) {
  const b = BRANDS[brand];
  const isLarge = size === "large";

  if (brand === "rostics") {
    return (
      <div className="flex items-center gap-3">
        <div className={`${isLarge ? "h-16 w-16 rounded-2xl" : "h-9 w-9 rounded-xl"} flex items-center justify-center bg-red-600 text-white shadow-sm`}>
          <span className={isLarge ? "font-serif text-4xl font-black italic" : "font-serif text-xl font-black italic"}>R</span>
        </div>
        {isLarge && (
          <div>
            <div className="text-3xl font-black tracking-tight text-slate-950">РОСТИК’С</div>
            <div className="text-lg font-medium text-slate-500">Чистота и анкетирование</div>
          </div>
        )}
      </div>
    );
  }

  if (brand === "tasty") {
    return (
      <div className="flex items-center gap-3">
        <div className={`${isLarge ? "h-16 w-16 rounded-2xl" : "h-9 w-9 rounded-xl"} flex items-center justify-center bg-orange-500 text-white shadow-sm`}>
          <span className={isLarge ? "text-xl font-black" : "text-xs font-black"}>ВиТ</span>
        </div>
        {isLarge && (
          <div>
            <div className="text-3xl font-black tracking-tight text-slate-950">ВКУСНО — И ТОЧКА</div>
            <div className="text-lg font-medium text-slate-500">Конкурентный бенчмарк</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`${isLarge ? "h-16 w-16 rounded-2xl" : "h-9 w-9 rounded-xl"} flex items-center justify-center bg-yellow-400 text-red-700 shadow-sm ring-2 ring-red-600/20`}>
        <span className={isLarge ? "text-2xl font-black" : "text-sm font-black"}>BK</span>
      </div>
      {isLarge && (
        <div>
          <div className="text-3xl font-black tracking-tight text-slate-950">БУРГЕР КИНГ</div>
          <div className="text-lg font-medium text-slate-500">Конкурентный бенчмарк</div>
        </div>
      )}
    </div>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <section className={`rounded-2xl border bg-white p-4 shadow-sm ${className}`} style={{ borderColor: COLORS.border }}>
      {title && <h3 className="mb-3 text-base font-black tracking-tight text-slate-950">{title}</h3>}
      {children}
    </section>
  );
}

function SelectFilter({ icon: Icon, label, value, options, onChange, wide }) {
  return (
    <label className={wide ? "min-w-[250px]" : "min-w-[155px]"}>
      <div className="mb-1.5 text-xs font-bold text-slate-500">{label}</div>
      <div className="relative">
        <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-0 pl-9 pr-9 text-sm font-semibold text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus:border-red-300"
        >
          {options.map((option) => (
            <option key={option.value || option} value={option.value || option}>{option.label || option}</option>
          ))}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

function BrandTabs({ value, onChange }) {
  const items = [{ key: "all", name: "Все бренды" }, ...Object.entries(BRANDS).map(([key, b]) => ({ key, name: b.name }))];
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-1">
      {items.map((item) => {
        const active = value === item.key;
        const color = item.key === "all" ? COLORS.text : BRANDS[item.key].color;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition"
            style={{ background: active ? "#fff" : "transparent", color: active ? color : COLORS.muted, boxShadow: active ? "0 1px 6px rgba(15,23,42,.08)" : "none" }}
          >
            {item.key !== "all" && <LogoBadge brand={item.key} />}
            {item.name}
          </button>
        );
      })}
    </div>
  );
}

function KpiCard({ label, value, delta, brand, hint }) {
  const color = brand === "all" ? COLORS.text : BRANDS[brand].color;
  const isDown = String(delta).startsWith("↓");
  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="text-xs font-bold leading-tight text-slate-500">{label}</div>
        {brand !== "all" && <LogoBadge brand={brand} />}
      </div>
      <div className="text-3xl font-black tracking-tight" style={{ color }}>{value}</div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-bold text-slate-500">{hint}</span>
        {delta && <span className={`shrink-0 font-black ${isDown ? "text-red-600" : "text-green-700"}`}>{delta}</span>}
      </div>
    </Card>
  );
}

function TooltipRu({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const names = { rostics: "Ростик’с", tasty: "Вкусно — и точка", bk: "Бургер Кинг", value: "Значение", cleanliness: "Чистота", survey: "Анкеты", checks: "Проверки" };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
      <div className="mb-2 font-black text-slate-900">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-5 font-bold" style={{ color: p.color }}>
          <span>{names[p.dataKey] || p.name}</span>
          <span>{p.dataKey === "checks" ? p.value : `${Number(p.value).toFixed(1)}%`}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ data, xKey, mode = "line" }) {
  const Chart = mode === "area" ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={230}>
      <Chart data={data} margin={{ top: 8, right: 14, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
        <YAxis domain={[40, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
        <Tooltip content={<TooltipRu />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {mode === "area" ? (
          <>
            <Area type="monotone" dataKey="rostics" name="Ростик’с" stroke={COLORS.red} fill="#E3061318" strokeWidth={3} />
            <Area type="monotone" dataKey="tasty" name="Вкусно — и точка" stroke={COLORS.orange} fill="#FF7A0014" strokeWidth={3} />
            <Area type="monotone" dataKey="bk" name="Бургер Кинг" stroke={COLORS.yellow} fill="#F5A40018" strokeWidth={3} />
          </>
        ) : (
          <>
            <Line type="monotone" dataKey="rostics" name="Ростик’с" stroke={COLORS.red} strokeWidth={3} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="tasty" name="Вкусно — и точка" stroke={COLORS.orange} strokeWidth={3} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="bk" name="Бургер Кинг" stroke={COLORS.yellow} strokeWidth={3} dot={{ r: 3 }} />
          </>
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

function BarCompareChart({ data, xKey }) {
  return (
    <ResponsiveContainer width="100%" height={235}>
      <BarChart data={data} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
        <Tooltip content={<TooltipRu />} />
        <Legend iconType="rect" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="rostics" name="Ростик’с" radius={[6, 6, 0, 0]} fill={COLORS.red} />
        <Bar dataKey="tasty" name="Вкусно — и точка" radius={[6, 6, 0, 0]} fill={COLORS.orange} />
        <Bar dataKey="bk" name="Бургер Кинг" radius={[6, 6, 0, 0]} fill={COLORS.yellow} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function RankingChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} layout="vertical" margin={{ top: 6, right: 36, left: 30, bottom: 0 }}>
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 12, fill: COLORS.text, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <Tooltip content={<TooltipRu />} />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DonutChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={3}>
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip content={<TooltipRu />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function SearchBox({ value, onChange }) {
  return (
    <div className="relative min-w-0 flex-1 md:max-w-xs">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Поиск ресторана"
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-red-300"
      />
    </div>
  );
}

export default function RosticsDashboard() {
  const [brand, setBrand] = useState("all");
  const [restaurantId, setRestaurantId] = useState("all");
  const [month, setMonth] = useState("май 2024");
  const [period, setPeriod] = useState("Все периоды");
  const [slot, setSlot] = useState("Все слоты");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const restaurantOptions = useMemo(() => {
    return [
      { value: "all", label: "Все рестораны" },
      ...restaurants
        .filter((r) => brand === "all" || r.brand === brand)
        .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
        .map((r) => ({ value: String(r.id), label: r.name })),
    ];
  }, [brand, search]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (brand !== "all" && r.brand !== brand) return false;
      if (restaurantId !== "all" && r.restaurantId !== Number(restaurantId)) return false;
      if (month !== "Все месяцы" && r.month !== month) return false;
      if (period !== "Все периоды" && r.period !== period) return false;
      if (slot !== "Все слоты" && r.slot !== slot) return false;
      if (search && !r.restaurantName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [brand, restaurantId, month, period, slot, search]);

  const currentStats = useMemo(() => {
    const brandsToShow = brand === "all" ? brandKeys : [brand];
    const byBrand = brandsToShow.map((b) => {
      const rows = filtered.filter((r) => r.brand === b);
      return {
        brand: b,
        name: BRANDS[b].name,
        color: BRANDS[b].color,
        cleanliness: avg(rows.map((r) => r.cleanliness)),
        survey: avg(rows.map((r) => r.survey)),
        checks: rows.reduce((s, r) => s + r.checks, 0),
        restaurants: new Set(rows.map((r) => r.restaurantId)).size,
      };
    });
    return byBrand;
  }, [filtered, brand]);

  const trendByWeek = useMemo(() => {
    return ["1 нед", "2 нед", "3 нед", "4 нед"].map((week) => {
      const item = { week };
      brandKeys.forEach((b) => {
        const rows = filtered.filter((r) => r.brand === b && r.week === week);
        item[b] = avg(rows.map((r) => r.cleanliness));
      });
      return item;
    });
  }, [filtered]);

  const surveyByWeek = useMemo(() => {
    return ["1 нед", "2 нед", "3 нед", "4 нед"].map((week) => {
      const item = { week };
      brandKeys.forEach((b) => {
        const rows = filtered.filter((r) => r.brand === b && r.week === week);
        item[b] = avg(rows.map((r) => r.survey));
      });
      return item;
    });
  }, [filtered]);

  const trendByMonth = useMemo(() => {
    return months.map((m, i) => {
      const item = { month: monthShort[i] };
      brandKeys.forEach((b) => {
        const rows = records.filter((r) => {
          if (brand !== "all" && r.brand !== brand) return false;
          if (restaurantId !== "all" && r.restaurantId !== Number(restaurantId)) return false;
          if (period !== "Все периоды" && r.period !== period) return false;
          if (slot !== "Все слоты" && r.slot !== slot) return false;
          if (search && !r.restaurantName.toLowerCase().includes(search.toLowerCase())) return false;
          return r.brand === b && r.month === m;
        });
        item[b] = avg(rows.map((r) => r.cleanliness));
      });
      return item;
    });
  }, [brand, restaurantId, period, slot, search]);

  const zoneData = useMemo(() => {
    return [
      { zone: "Зал", rostics: avg(filtered.filter((r) => r.brand === "rostics").map((r) => r.hall)), tasty: avg(filtered.filter((r) => r.brand === "tasty").map((r) => r.hall)), bk: avg(filtered.filter((r) => r.brand === "bk").map((r) => r.hall)) },
      { zone: "Туалеты", rostics: avg(filtered.filter((r) => r.brand === "rostics").map((r) => r.wc)), tasty: avg(filtered.filter((r) => r.brand === "tasty").map((r) => r.wc)), bk: avg(filtered.filter((r) => r.brand === "bk").map((r) => r.wc)) },
      { zone: "Кухня", rostics: avg(filtered.filter((r) => r.brand === "rostics").map((r) => r.kitchen)), tasty: avg(filtered.filter((r) => r.brand === "tasty").map((r) => r.kitchen)), bk: avg(filtered.filter((r) => r.brand === "bk").map((r) => r.kitchen)) },
      { zone: "Фасад", rostics: avg(filtered.filter((r) => r.brand === "rostics").map((r) => r.facade)), tasty: avg(filtered.filter((r) => r.brand === "tasty").map((r) => r.facade)), bk: avg(filtered.filter((r) => r.brand === "bk").map((r) => r.facade)) },
    ];
  }, [filtered]);

  const ranking = useMemo(() => {
    return currentStats
      .map((s) => ({ name: s.name, value: s.cleanliness, color: s.color }))
      .sort((a, b) => b.value - a.value);
  }, [currentStats]);

  const donut = useMemo(() => {
    return currentStats.map((s) => ({ name: s.name, value: s.checks, color: s.color }));
  }, [currentStats]);

  const topRestaurants = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      if (!map.has(r.restaurantId)) map.set(r.restaurantId, { name: r.restaurantName, brand: r.brand, values: [], checks: 0 });
      map.get(r.restaurantId).values.push(r.cleanliness);
      map.get(r.restaurantId).checks += r.checks;
    });
    return Array.from(map.values())
      .map((r) => ({ ...r, avg: avg(r.values) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);
  }, [filtered]);

  const allAvgCleanliness = avg(filtered.map((r) => r.cleanliness));
  const allAvgSurvey = avg(filtered.map((r) => r.survey));
  const allChecks = filtered.reduce((s, r) => s + r.checks, 0);
  const allRestaurantsCount = new Set(filtered.map((r) => r.restaurantId)).size;

  const resetFilters = () => {
    setBrand("all");
    setRestaurantId("all");
    setMonth("май 2024");
    setPeriod("Все периоды");
    setSlot("Все слоты");
    setSearch("");
  };

  const filterControls = (
    <>
      <SearchBox value={search} onChange={setSearch} />
      <SelectFilter icon={Store} label="Ресторан" value={restaurantId} options={restaurantOptions} onChange={setRestaurantId} wide />
      <SelectFilter icon={CalendarDays} label="Месяц" value={month} options={["Все месяцы", ...months]} onChange={setMonth} />
      <SelectFilter icon={CalendarDays} label="Период" value={period} options={periods} onChange={setPeriod} />
      <SelectFilter icon={Clock3} label="Слот" value={slot} options={slots} onChange={setSlot} />
      <button onClick={resetFilters} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-500 shadow-sm transition hover:text-red-600">
        <X size={15} /> Сбросить
      </button>
    </>
  );

  return (
    <main className="min-h-screen p-3 sm:p-5" style={{ background: COLORS.page }}>
      <div className="mx-auto max-w-[1480px]">
        <header className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <LogoBadge brand="rostics" size="large" />
              <div className="hidden h-14 w-px bg-slate-200 lg:block" />
              <div className="hidden lg:block">
                <div className="text-sm font-black uppercase tracking-[0.22em] text-red-600">BI Dashboard</div>
                <div className="text-2xl font-black tracking-tight text-slate-950">Сравнение чистоты, анкетирования и конкурентов</div>
              </div>
            </div>

            <button onClick={() => setShowFilters((v) => !v)} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800 xl:hidden">
              <SlidersHorizontal size={16} /> Фильтры
            </button>
          </div>

          <div className="mt-4">
            <BrandTabs value={brand} onChange={(next) => { setBrand(next); setRestaurantId("all"); }} />
          </div>

          <div className="mt-4 hidden flex-wrap items-end gap-3 xl:flex">
            {filterControls}
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
              {filterControls}
            </div>
          )}
        </header>

        <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
          <KpiCard label="Средняя чистота" value={formatPct(allAvgCleanliness)} brand="all" hint="по фильтрам" delta="" />
          <KpiCard label="Процент анкет" value={formatPct(allAvgSurvey)} brand="all" hint="по фильтрам" delta="" />
          <KpiCard label="Всего проверок" value={allChecks.toLocaleString("ru-RU")} brand="all" hint="визитов" delta="" />
          <KpiCard label="Ресторанов" value={allRestaurantsCount} brand="all" hint="в выборке" delta="" />
          {currentStats.slice(0, 2).map((s) => (
            <KpiCard key={s.brand} label="Чистота бренда" value={formatPct(s.cleanliness)} brand={s.brand} hint={s.name} delta={s.cleanliness >= allAvgCleanliness ? "↑ выше ср." : "↓ ниже ср."} />
          ))}
        </section>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card title="Динамика индекса чистоты по неделям (%)">
            <TrendChart data={trendByWeek} xKey="week" mode="area" />
          </Card>
          <Card title="Динамика процента анкет по неделям (%)">
            <TrendChart data={surveyByWeek} xKey="week" />
          </Card>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card title="Динамика чистоты по месяцам (%)">
            <TrendChart data={trendByMonth} xKey="month" />
          </Card>
          <Card title="Индекс чистоты по зонам">
            <BarCompareChart data={zoneData} xKey="zone" />
          </Card>
          <Card title="Рейтинг брендов по чистоте">
            <RankingChart data={ranking} />
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card title="ТОП ресторанов по чистоте" className="xl:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-3 pr-4">#</th>
                    <th className="py-3 pr-4">Ресторан</th>
                    <th className="py-3 pr-4">Бренд</th>
                    <th className="py-3 pr-4 text-right">Чистота</th>
                    <th className="py-3 pr-4 text-right">Проверки</th>
                  </tr>
                </thead>
                <tbody>
                  {topRestaurants.map((r, i) => (
                    <tr key={r.name} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-3 pr-4 font-black text-slate-400">{i + 1}</td>
                      <td className="py-3 pr-4 font-bold text-slate-900">{r.name}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2 font-bold" style={{ color: BRANDS[r.brand].color }}>
                          <LogoBadge brand={r.brand} /> {BRANDS[r.brand].name}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-black" style={{ color: BRANDS[r.brand].color }}>{formatPct(r.avg)}</td>
                      <td className="py-3 pr-4 text-right font-bold text-slate-600">{r.checks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Доля проверок по брендам">
            <DonutChart data={donut} />
            <div className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
              Все графики, KPI и таблица пересчитываются при изменении бренда, ресторана, месяца, периода и слота.
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
