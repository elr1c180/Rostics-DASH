import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, ChevronDown, Clock3, Search, SlidersHorizontal, Store, X } from "lucide-react";

const COLORS = {
  page: "#F7F6F2",
  text: "#101827",
  muted: "#6B7280",
  red: "#E30613",
  green: "#168A45",
  yellow: "#F5A400",
  blue: "#2563EB",
  gray: "#94A3B8",
  grid: "#ECECEC",
};

const BRANDS = {
  rostics: { name: "Ростик’с", short: "R", color: COLORS.red, badge: "bg-red-600" },
  tasty: { name: "Вкусно — и точка", short: "ВиТ", color: COLORS.green, badge: "bg-green-700" },
  bk: { name: "Бургер Кинг", short: "BK", color: COLORS.yellow, badge: "bg-yellow-400 text-red-700" },
};

const BLOCKS = [
  { key: "cleanliness", name: "Чистота", detail: "Зал и туалет" },
  { key: "personnel", name: "Персонал", detail: "Гостеприимство" },
  { key: "food", name: "Еда", detail: "Блюда" },
];
const COMPARISON_LABELS = {
  speed: "Быстрее обслужили",
  taste: "Вкуснее еда",
  cleanliness: "Чище туалет",
  friendliness: "Дружелюбнее",
  choice: "Итоговый выбор",
};
const brandKeys = Object.keys(BRANDS);
const periods = ["Все периоды", "Будни", "Выходные"];
const slots = ["Все слоты", "Утро", "Час-пик", "Вечер"];
const emptyDashboardData = { restaurants: [], records: [], months: [], monthShort: [], meta: {} };

function mockNumber(seed, min, max) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return min + (value - Math.floor(value)) * (max - min);
}

function createMockDashboardData() {
  const months = ["апрель 2026", "май 2026", "июнь 2026"];
  const monthShort = ["апр", "май", "июн"];
  const restaurantNames = {
    rostics: ["Ростик’с Арбат", "Ростик’с ВДНХ", "Ростик’с Сургут"],
    tasty: ["ВиТ Тверская", "ВиТ Иваново", "ВиТ Макси"],
    bk: ["Бургер Кинг Метрополис", "Бургер Кинг Евролэнд", "Бургер Кинг ВДНХ"],
  };
  const restaurants = brandKeys.flatMap((brand, brandIndex) =>
    restaurantNames[brand].map((name, index) => ({
      id: brandIndex * 10 + index + 1,
      name,
      brand,
      city: index === 0 ? "Москва" : index === 1 ? "Иваново" : "Сургут",
      type: "Ресторан",
    })),
  );
  const issues = [
    "Грязный зал/туалет",
    "Долгое ожидание",
    "Невкусная еда (несвежая, холодная)",
    "Невежливый или безразличный персонал",
    "Неработающее оборудование (терминалы, свет)",
  ];
  const comparisonAnswers = ["rostics", "tasty", "bk", "same"];
  const records = [];

  restaurants.forEach((restaurant, restaurantIndex) => {
    months.forEach((month, monthIndex) => {
      for (let visit = 0; visit < 4; visit += 1) {
        const seed = restaurant.id * 100 + monthIndex * 10 + visit;
        const brandBoost = restaurant.brand === "rostics" ? 2 : restaurant.brand === "tasty" ? 0 : 4;
        const paired = visit < 2;
        const issueIndex = Math.floor(mockNumber(seed + 7, 0, issues.length));
        const hasIssue = mockNumber(seed + 8, 0, 1) > 0.55;
        const comparison = {};

        Object.keys(COMPARISON_LABELS).forEach((key, keyIndex) => {
          comparison[key] = paired
            ? comparisonAnswers[Math.floor(mockNumber(seed + keyIndex + 20, 0, comparisonAnswers.length))]
            : null;
        });

        records.push({
          checkNumber: records.length + 1,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          brand: restaurant.brand,
          city: restaurant.city,
          type: restaurant.type,
          month,
          monthShort: monthShort[monthIndex],
          week: `${visit + 1} нед`,
          period: visit % 3 === 0 ? "Выходные" : "Будни",
          slot: slots[(visit % 3) + 1],
          cleanliness: Number(mockNumber(seed + 1, 52 + brandBoost, 82 + brandBoost).toFixed(1)),
          personnel: Number(mockNumber(seed + 2, 66 + brandBoost, 91 + brandBoost).toFixed(1)),
          food: Number(mockNumber(seed + 3, 82 + brandBoost, 99).toFixed(1)),
          checks: 1,
          wait: mockNumber(seed + 4, 0, 1) > 0.65
            ? "более 5 минут"
            : mockNumber(seed + 5, 0, 1) > 0.12
              ? "до 5 минут"
              : "Посещал ресторан в период низкой загрузки",
          mood: mockNumber(seed + 6, 0, 1) > 0.45
            ? "Положительное, хочется вернуться"
            : mockNumber(seed + 9, 0, 1) > 0.25
              ? "Нейтральное, просто поел"
              : "Негативное, оставило осадок",
          npsScore: Math.max(1, Math.min(10, Math.round(mockNumber(seed + 10, 5, 11)))),
          criticalIssues: hasIssue ? [issues[issueIndex]] : ["Замечаний нет"],
          comparison,
          isPaired: paired,
        });
      }
    });
  });

  return {
    restaurants,
    records,
    months,
    monthShort,
    meta: {
      questionnaireId: 278,
      generatedAt: new Date().toISOString(),
      mock: true,
    },
  };
}

function normalizeDashboardData(data) {
  const source = data && typeof data === "object" ? data : emptyDashboardData;
  return {
    restaurants: Array.isArray(source.restaurants)
      ? source.restaurants.map((restaurant) => ({
          ...restaurant,
          name: String(restaurant?.name || ""),
        }))
      : [],
    records: Array.isArray(source.records)
      ? source.records.map((record) => ({
          ...record,
          restaurantName: String(record?.restaurantName || ""),
          wait: String(record?.wait || ""),
          mood: String(record?.mood || ""),
          checks: Number(record.checks || 1),
          cleanliness: record.cleanliness == null ? null : Number(record.cleanliness),
          personnel: record.personnel == null ? null : Number(record.personnel),
          food: record.food == null ? null : Number(record.food),
          npsScore: record.npsScore == null ? null : Number(record.npsScore),
          criticalIssues: Array.isArray(record.criticalIssues)
            ? record.criticalIssues.map((issue) => String(issue || "")).filter(Boolean)
            : [],
          comparison: record.comparison && typeof record.comparison === "object"
            ? record.comparison
            : {},
        }))
      : [],
    months: Array.isArray(source.months) ? source.months : [],
    monthShort: Array.isArray(source.monthShort) ? source.monthShort : [],
    meta: source.meta || {},
  };
}

function avg(values) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return null;
  return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1));
}

function formatPct(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
}

function nps(values) {
  const valid = values.filter((value) => Number.isFinite(value) && value >= 1 && value <= 10);
  if (!valid.length) return null;
  const promoters = valid.filter((value) => value >= 9).length;
  const detractors = valid.filter((value) => value <= 6).length;
  return Math.round(((promoters - detractors) / valid.length) * 100);
}

function LogoBadge({ brand, large = false }) {
  const item = BRANDS[brand];
  return (
    <div className="flex items-center gap-3">
      <div className={`${large ? "h-16 w-16 rounded-2xl text-xl" : "h-9 w-9 rounded-xl text-xs"} ${item.badge} flex shrink-0 items-center justify-center font-black text-white shadow-sm`}>
        {item.short}
      </div>
      {large && (
        <div>
          <div className="text-3xl font-black tracking-tight text-slate-950">РОСТИК’С</div>
          <div className="text-base font-semibold text-slate-500">Качество визита и конкурентный анализ</div>
        </div>
      )}
    </div>
  );
}

function Card({ title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {title && <h3 className="text-base font-black tracking-tight text-slate-950">{title}</h3>}
      {subtitle && <p className="mb-3 mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>}
      {!subtitle && title && <div className="mb-3" />}
      {children}
    </section>
  );
}

function SelectFilter({ icon: Icon, label, value, options, onChange, wide = false }) {
  return (
    <label className={wide ? "min-w-[250px]" : "min-w-[155px]"}>
      <div className="mb-1.5 text-xs font-bold text-slate-500">{label}</div>
      <div className="relative">
        <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-0 pl-9 pr-9 text-sm font-semibold text-slate-900 shadow-sm outline-none focus:border-red-300"
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
  const items = [{ key: "all", name: "Все бренды" }, ...brandKeys.map((key) => ({ key, name: BRANDS[key].name }))];
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

function KpiCard({ label, value, detail, color = COLORS.text }) {
  return (
    <Card>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-tight" style={{ color }}>{value}</div>
      <div className="mt-2 text-xs font-bold text-slate-500">{detail}</div>
    </Card>
  );
}

function ChartTooltip({ active, payload, label, percent = true }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
      <div className="mb-2 font-black text-slate-900">{label}</div>
      {payload.map((item) => (
        <div key={`${item.dataKey}-${item.name}`} className="flex items-center justify-between gap-5 font-bold" style={{ color: item.color }}>
          <span>{item.name}</span>
          <span>{percent ? `${Number(item.value || 0).toFixed(1)}%` : item.value}</span>
        </div>
      ))}
    </div>
  );
}

function BrandBlockChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="block" tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {brandKeys.map((key) => <Bar key={key} dataKey={key} name={BRANDS[key].name} fill={BRANDS[key].color} radius={[5, 5, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

function TrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: COLORS.muted }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {brandKeys.map((key) => (
          <Line key={key} type="monotone" dataKey={key} name={BRANDS[key].name} stroke={BRANDS[key].color} strokeWidth={3} dot={{ r: 4 }} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function HorizontalBars({ data, color = COLORS.red, percent = true, height = 250 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 60, left: 40, bottom: 0 }}>
        <XAxis type="number" domain={percent ? [0, 100] : [0, "dataMax"]} hide />
        <YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 11, fill: COLORS.text, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip percent={percent} />} />
        <Bar dataKey="value" name={percent ? "Доля" : "Проверки"} fill={color} radius={[0, 7, 7, 0]} barSize={22}>
          <LabelList dataKey="value" position="right" formatter={(value) => percent ? `${Number(value).toFixed(1)}%` : value} style={{ fill: COLORS.text, fontSize: 11, fontWeight: 900 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ComparisonChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 10, left: 45, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} ticks={[0, 30, 60, 100]} allowDataOverflow tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="metric" width={135} tick={{ fontSize: 11, fill: COLORS.text, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {brandKeys.map((key) => <Bar key={key} dataKey={key} stackId="comparison" name={BRANDS[key].name} fill={BRANDS[key].color} />)}
        <Bar dataKey="same" stackId="comparison" name="Одинаково" fill={COLORS.gray} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DonutChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3}>
          {data.map((item) => <Cell key={item.name} fill={item.color} />)}
        </Pie>
        <Tooltip content={<ChartTooltip percent={false} />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function RosticsDashboard() {
  const [dashboardData, setDashboardData] = useState(emptyDashboardData);
  const [dataStatus, setDataStatus] = useState("loading");
  const [dataError, setDataError] = useState("");
  const [brand, setBrand] = useState("all");
  const [restaurantId, setRestaurantId] = useState("all");
  const [month, setMonth] = useState("Все месяцы");
  const [period, setPeriod] = useState("Все периоды");
  const [slot, setSlot] = useState("Все слоты");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/rostics-dashboard-api", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text() || `HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        setDashboardData(normalizeDashboardData(data));
        setDataStatus("ready");
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setDashboardData(normalizeDashboardData(createMockDashboardData()));
        setDataStatus("mock");
        setDataError(error.message);
      });
    return () => controller.abort();
  }, []);

  const { restaurants, records, months, monthShort, meta } = dashboardData;
  const restaurantOptions = useMemo(() => [
    { value: "all", label: "Все рестораны" },
    ...restaurants
      .filter((restaurant) => brand === "all" || restaurant.brand === brand)
      .filter((restaurant) => restaurant.name.toLowerCase().includes(search.toLowerCase()))
      .map((restaurant) => ({ value: String(restaurant.id), label: restaurant.name })),
  ], [brand, restaurants, search]);

  const matchesBaseFilters = (record, includeMonth = true) => {
    if (brand !== "all" && record.brand !== brand) return false;
    if (restaurantId !== "all" && record.restaurantId !== Number(restaurantId)) return false;
    if (includeMonth && month !== "Все месяцы" && record.month !== month) return false;
    if (period !== "Все периоды" && record.period !== period) return false;
    if (slot !== "Все слоты" && record.slot !== slot) return false;
    if (search && !record.restaurantName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  };

  const filtered = useMemo(
    () => records.filter((record) => matchesBaseFilters(record)),
    [brand, restaurantId, month, period, slot, search, records],
  );

  const blockAverages = Object.fromEntries(BLOCKS.map((block) => [block.key, avg(filtered.map((record) => record[block.key]))]));
  const waitAnswered = filtered.filter((record) => record.wait);
  const waitUnderFive = waitAnswered.length
    ? (waitAnswered.filter((record) => record.wait.toLowerCase().includes("до 5")).length / waitAnswered.length) * 100
    : null;
  const currentNps = nps(filtered.map((record) => record.npsScore));

  const moodData = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    filtered.forEach((record) => {
      const mood = String(record.mood || "").toLowerCase();
      if (mood.includes("полож")) counts.positive += 1;
      else if (mood.includes("нейтр")) counts.neutral += 1;
      else if (mood.includes("негат")) counts.negative += 1;
    });
    return [
      { name: "Положительное", value: counts.positive, color: COLORS.green },
      { name: "Нейтральное", value: counts.neutral, color: COLORS.gray },
      { name: "Негативное", value: counts.negative, color: COLORS.red },
    ].filter((item) => item.value > 0);
  }, [filtered]);

  const waitData = useMemo(() => {
    const counts = new Map();
    filtered.forEach((record) => {
      if (!record.wait) return;
      let label = "Низкая загрузка";
      if (record.wait.toLowerCase().includes("до 5")) label = "До 5 минут";
      else if (record.wait.toLowerCase().includes("более 5")) label = "Более 5 минут";
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(counts, ([name, value]) => ({ name, value: total ? Number(((value / total) * 100).toFixed(1)) : 0 }));
  }, [filtered]);

  const criticalData = useMemo(() => {
    const counts = new Map();
    filtered.forEach((record) => record.criticalIssues.forEach((issue) => {
      counts.set(issue, (counts.get(issue) || 0) + 1);
    }));
    return Array.from(counts, ([name, value]) => ({ name, value }))
      .filter((item) => item.name.toLowerCase() !== "замечаний нет")
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filtered]);

  const brandBlockData = useMemo(() => BLOCKS.map((block) => {
    const row = { block: block.name };
    brandKeys.forEach((key) => {
      row[key] = avg(filtered.filter((record) => record.brand === key).map((record) => record[block.key]));
    });
    return row;
  }), [filtered]);

  const trendData = useMemo(() => months.map((monthName, index) => {
    const row = { month: monthShort[index] || monthName };
    brandKeys.forEach((key) => {
      const brandRecords = records.filter((record) => record.month === monthName && record.brand === key && matchesBaseFilters(record, false));
      row[key] = avg(brandRecords.flatMap((record) => BLOCKS.map((block) => record[block.key])));
    });
    return row;
  }), [brand, restaurantId, period, slot, search, months, monthShort, records]);

  const comparisonData = useMemo(() => Object.entries(COMPARISON_LABELS).map(([key, metric]) => {
    const answers = filtered.map((record) => record.comparison[key]).filter(Boolean);
    const total = answers.length;
    const row = { metric };
    [...brandKeys, "same"].forEach((answer) => {
      row[answer] = total ? Number(((answers.filter((value) => value === answer).length / total) * 100).toFixed(1)) : 0;
    });
    return row;
  }), [filtered]);
  const pairedChecks = filtered.filter((record) => record.isPaired).length;

  const topRestaurants = useMemo(() => {
    const map = new Map();
    filtered.forEach((record) => {
      if (!map.has(record.restaurantId)) {
        map.set(record.restaurantId, { name: record.restaurantName, brand: record.brand, checks: 0, cleanliness: [], personnel: [], food: [] });
      }
      const item = map.get(record.restaurantId);
      item.checks += 1;
      BLOCKS.forEach((block) => item[block.key].push(record[block.key]));
    });
    return Array.from(map.values())
      .map((item) => {
        const result = { ...item };
        BLOCKS.forEach((block) => { result[block.key] = avg(item[block.key]); });
        result.total = avg(BLOCKS.map((block) => result[block.key]));
        return result;
      })
      .sort((a, b) => (b.total ?? -1) - (a.total ?? -1))
      .slice(0, 10);
  }, [filtered]);

  const checkShare = useMemo(() => brandKeys.map((key) => ({
    name: BRANDS[key].name,
    value: filtered.filter((record) => record.brand === key).length,
    color: BRANDS[key].color,
  })).filter((item) => item.value > 0), [filtered]);

  const resetFilters = () => {
    setBrand("all");
    setRestaurantId("all");
    setMonth("Все месяцы");
    setPeriod("Все периоды");
    setSlot("Все слоты");
    setSearch("");
  };

  const filterControls = (
    <>
      <label className="relative min-w-0 flex-1 md:max-w-xs">
        <div className="mb-1.5 text-xs font-bold text-slate-500">Поиск</div>
        <Search size={16} className="pointer-events-none absolute left-3 top-[35px] -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ресторан" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-red-300" />
      </label>
      <SelectFilter icon={Store} label="Ресторан" value={restaurantId} options={restaurantOptions} onChange={setRestaurantId} wide />
      <SelectFilter icon={CalendarDays} label="Месяц" value={month} options={["Все месяцы", ...months]} onChange={setMonth} />
      <SelectFilter icon={CalendarDays} label="Период" value={period} options={periods} onChange={setPeriod} />
      <SelectFilter icon={Clock3} label="Слот" value={slot} options={slots} onChange={setSlot} />
      <button onClick={resetFilters} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-500 shadow-sm hover:text-red-600">
        <X size={15} /> Сбросить
      </button>
    </>
  );

  const statusLabel = dataStatus === "ready" ? "База данных" : dataStatus === "loading" ? "Загрузка" : "Демо-данные";
  const statusClass = dataStatus === "ready"
    ? "bg-green-50 text-green-700"
    : dataStatus === "loading"
      ? "bg-blue-50 text-blue-700"
      : "bg-amber-50 text-amber-700";

  return (
    <main className="min-h-screen p-3 sm:p-5" style={{ background: COLORS.page }}>
      <div className="mx-auto max-w-[1480px]">
        <header className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <LogoBadge brand="rostics" large />
              <div className="hidden h-14 w-px bg-slate-200 lg:block" />
              <div className="hidden lg:block">
                <div className="text-sm font-black uppercase tracking-[0.22em] text-red-600">BI Dashboard</div>
                <div className="text-2xl font-black tracking-tight text-slate-950">Оценка блоков анкеты</div>
                <div className="text-sm font-semibold text-slate-500">Последние 3 месяца · анкета {meta.questionnaireId || 278}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`rounded-xl px-3 py-2 text-xs font-black ${statusClass}`} title={dataError || "Данные загружены"}>{statusLabel}</div>
              <button onClick={() => setShowFilters((value) => !value)} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800 xl:hidden">
                <SlidersHorizontal size={16} /> Фильтры
              </button>
            </div>
          </div>
          <div className="mt-4"><BrandTabs value={brand} onChange={(value) => { setBrand(value); setRestaurantId("all"); }} /></div>
          <div className="mt-4 hidden flex-wrap items-end gap-3 xl:flex">{filterControls}</div>
          {showFilters && <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">{filterControls}</div>}
        </header>

        <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {BLOCKS.map((block) => <KpiCard key={block.key} label={block.name} value={formatPct(blockAverages[block.key])} detail={block.detail} color={COLORS.red} />)}
          <KpiCard label="Ожидание до 5 минут" value={formatPct(waitUnderFive)} detail={`Вопрос 8 · ${waitAnswered.length} ответов`} color={COLORS.blue} />
          <KpiCard label="NPS" value={Number.isFinite(currentNps) ? currentNps : "—"} detail="Вопрос 42" color={currentNps >= 0 ? COLORS.green : COLORS.red} />
          <KpiCard label="Проверки" value={filtered.length.toLocaleString("ru-RU")} detail={months.length ? months.join(" · ") : "Нет данных"} />
        </section>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card title="Оценка блоков по брендам" subtitle="Чистота: зал и туалет · Персонал: гостеприимство · Еда: блюда">
            <BrandBlockChart data={brandBlockData} />
          </Card>
          <Card title="Динамика общей оценки" subtitle="Среднее трех блоков по доступным месяцам">
            <TrendChart data={trendData} />
          </Card>
        </section>

        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card title="Длительность ожидания" subtitle="Вопрос 8">
            <HorizontalBars data={waitData} color={COLORS.blue} height={230} />
          </Card>
          <Card title="Настроение после визита" subtitle="Вопрос 41">
            <DonutChart data={moodData} />
          </Card>
          <Card title="Критические недостатки" subtitle="Вопрос 44 · топ упоминаний">
            <HorizontalBars data={criticalData} color={COLORS.red} percent={false} height={230} />
          </Card>
        </section>

        <section className="mb-5">
          <Card title="Сравнительный анализ" subtitle={`Только парные проверки · ${pairedChecks} анкет · вопросы 48–52`}>
            <ComparisonChart data={comparisonData} />
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card title="Рейтинг ресторанов" subtitle="Среднее по чистоте, персоналу и еде" className="xl:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-3 pr-3">#</th>
                    <th className="py-3 pr-3">Ресторан</th>
                    <th className="py-3 pr-3">Бренд</th>
                    <th className="py-3 pr-3 text-right">Чистота</th>
                    <th className="py-3 pr-3 text-right">Персонал</th>
                    <th className="py-3 pr-3 text-right">Еда</th>
                    <th className="py-3 pr-3 text-right">Итого</th>
                  </tr>
                </thead>
                <tbody>
                  {topRestaurants.map((item, index) => (
                    <tr key={`${item.brand}-${item.name}`} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-3 font-black text-slate-400">{index + 1}</td>
                      <td className="py-3 pr-3 font-bold text-slate-900">{item.name}</td>
                      <td className="py-3 pr-3"><div className="flex items-center gap-2 font-bold" style={{ color: BRANDS[item.brand].color }}><LogoBadge brand={item.brand} />{BRANDS[item.brand].name}</div></td>
                      <td className="py-3 pr-3 text-right font-bold">{formatPct(item.cleanliness)}</td>
                      <td className="py-3 pr-3 text-right font-bold">{formatPct(item.personnel)}</td>
                      <td className="py-3 pr-3 text-right font-bold">{formatPct(item.food)}</td>
                      <td className="py-3 pr-3 text-right font-black" style={{ color: BRANDS[item.brand].color }}>{formatPct(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Доля проверок по брендам" subtitle="По текущим фильтрам">
            <DonutChart data={checkShare} />
          </Card>
        </section>
      </div>
    </main>
  );
}
