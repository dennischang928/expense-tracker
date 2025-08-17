import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Paper,
  Title,
  Table,
  Group,
  Badge,
  Stack,
  Text,
  Divider,
  NumberFormatter,
  ScrollArea,
  TextInput,
  NumberInput,
  Select,
  SegmentedControl,
  SimpleGrid,
  Card,
  Tooltip,
  ActionIcon,
  Checkbox,
  Button,
  RingProgress,
  Center,
} from "@mantine/core";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { IconEdit, IconCheck, IconX, IconTrash } from "@tabler/icons-react";

function asNumber(n, fallback = 0) {
  const v = typeof n === "number" ? n : parseFloat(n ?? "0");
  return Number.isFinite(v) ? v : fallback;
}

function monthKey(isoDate = "") {
  // Expect yyyy-mm-dd; fallback to empty
  return isoDate?.slice(0, 7) || "";
}

export default function Dashboard() {
  const { expenses = [], updateExpenses } = useOutletContext();
  
  const updateExpense = (index, updatedExpense) => {
    const newExpenses = [...expenses];
    newExpenses[index] = updatedExpense;
    updateExpenses(newExpenses);
  };

  const deleteExpense = (index) => {
    const newExpenses = expenses.filter((_, i) => i !== index);
    updateExpenses(newExpenses);
  };
  
  // Apple-inspired color palette
  const colors = {
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    gray: '#8E8E93',
    chart: ['#007AFF', '#5856D6', '#FF9500', '#34C759', '#FF3B30', '#5AC8FA', '#FF2D55', '#AF52DE'],
  };

  // ---------- Totals ----------
  const totals = useMemo(() => {
    const totalItems = expenses.length;
    const totalAmount = expenses.reduce((acc, e) => acc + asNumber(e.price), 0);
    return { totalItems, totalAmount };
  }, [expenses]);

  // ---------- Category analysis ----------
  const byCategory = useMemo(() => {
    const map = new Map();
    for (const e of expenses) {
      const cat = e?.category || "Other";
      const price = asNumber(e.price);
      const unit = asNumber(e.unitPrice);
      const qty = asNumber(e.qty, 1);
      const date = e?.date || "No Date";
      const store = e?.store || "Other";
      const item = e?.item || "Unknown Item";

      if (!map.has(cat)) {
        map.set(cat, {
          category: cat,
          total: 0,
          count: 0,
          unitSum: 0,
          qtySum: 0,
          dateGroups: new Map(),
          storeGroups: new Map()
        });
      }
      const rec = map.get(cat);
      rec.total += price;
      rec.count += 1;
      rec.unitSum += unit;
      rec.qtySum += qty;

      // Group by date
      if (!rec.dateGroups.has(date)) {
        rec.dateGroups.set(date, { items: [], total: 0 });
      }
      rec.dateGroups.get(date).items.push({ item, price });
      rec.dateGroups.get(date).total += price;

      // Group by store
      if (!rec.storeGroups.has(store)) {
        rec.storeGroups.set(store, { items: [], total: 0 });
      }
      rec.storeGroups.get(store).items.push({ item, price });
      rec.storeGroups.get(store).total += price;
    }

    const arr = Array.from(map.values());
    // Process groups and calculate averages
    arr.forEach((r) => {
      r.avgUnit = r.count ? r.unitSum / r.count : 0;
      
      // Convert date groups to sorted array
      r.dateItems = Array.from(r.dateGroups.entries())
        .sort((a, b) => b[0].localeCompare(a[0])) // newest first
        .map(([date, data]) => ({
          label: date,
          ...data
        }));

      // Convert store groups to sorted array
      r.storeItems = Array.from(r.storeGroups.entries())
        .sort((a, b) => b[1].total - a[1].total) // highest total first
        .map(([store, data]) => ({
          label: store,
          ...data
        }));

      // Clean up Maps to avoid serialization issues
      delete r.dateGroups;
      delete r.storeGroups;
    });
    
    // sort by total desc
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [expenses]);

  // ---------- Monthly summary ----------
  const byMonth = useMemo(() => {
    const map = new Map();
    const now = new Date();
    const monthsToShow = 12; // Show last 12 months
    
    // Initialize last 12 months
    for (let i = 0; i < monthsToShow; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const monthName = d.toLocaleString('default', { month: 'short' });
      map.set(key, { 
        month: key, 
        monthName,
        total: 0, 
        count: 0,
        categories: new Map()
      });
    }

    // Populate with actual data
    for (const e of expenses) {
      const key = monthKey(e?.date);
      const price = asNumber(e.price);
      if (!key || !map.has(key)) continue;
      
      const rec = map.get(key);
      rec.total += price;
      rec.count += 1;

      // Track category totals
      const cat = e?.category || 'Other';
      if (!rec.categories.has(cat)) {
        rec.categories.set(cat, { total: 0, count: 0 });
      }
      const catRec = rec.categories.get(cat);
      catRec.total += price;
      catRec.count += 1;
    }

    const arr = Array.from(map.values());
    // sort oldest to newest for charts
    arr.sort((a, b) => a.month.localeCompare(b.month));
    
    // Calculate month-over-month changes
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1].total;
      const curr = arr[i].total;
      arr[i].change = prev ? ((curr - prev) / prev) * 100 : 0;
    }
    
    return arr;
  }, [expenses]);

  // ---------- Store analysis ----------
  const byStore = useMemo(() => {
    const map = new Map();
    for (const e of expenses) {
      const store = e?.store || "Other";
      const price = asNumber(e.price);
      if (!map.has(store)) {
        map.set(store, { store, total: 0, count: 0, items: new Set() });
      }
      const rec = map.get(store);
      rec.total += price;
      rec.count += 1;
      rec.items.add(e.item);
    }
    const arr = Array.from(map.values());
    // Add unique items count
    arr.forEach(r => r.uniqueItems = r.items.size);
    // sort by total desc
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [expenses]);

  // ---------- Trend Analysis ----------
  const trends = useMemo(() => {
    if (!byMonth.length) return { monthlyChange: 0, trend: 'stable' };
    
    const lastMonth = byMonth[byMonth.length - 1];
    const monthlyChange = lastMonth.change;
    
    // Determine trend based on last 3 months
    const recent = byMonth.slice(-3);
    const increases = recent.filter(m => m.change > 0).length;
    const decreases = recent.filter(m => m.change < 0).length;
    
    let trend = 'stable';
    if (increases >= 2) trend = 'increasing';
    if (decreases >= 2) trend = 'decreasing';
    
    return { monthlyChange, trend };
  }, [byMonth]);

  // ---------- Search / ranking panel ----------
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("unitPrice"); // 'unitPrice' | 'price'
  const [order, setOrder] = useState("asc"); // 'asc' | 'desc'
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [categoryGroupBy, setCategoryGroupBy] = useState("date");

  // ---------- Inline edit state ----------
  const [editIndex, setEditIndex] = useState(-1);
  const [draft, setDraft] = useState(null);

  const startEdit = (i, exp) => {
    setEditIndex(i);
    setDraft({ ...exp });
  };

  const cancelEdit = () => {
    setEditIndex(-1);
    setDraft(null);
  };

  const num = (v, f = 0) => (typeof v === "number" ? v : parseFloat(v ?? f)) || f;

  const saveEdit = () => {
    if (!draft || !draft.item?.trim() || !draft.date) return; // minimal validation
    const unit = +num(draft.unitPrice).toFixed(2);
    const qty = +num(draft.qty, 0);
    const price = +(draft.price != null ? num(draft.price) : unit * qty).toFixed(2);
    if (typeof updateExpense === 'function') {
      updateExpense(editIndex, { ...draft, unitPrice: unit, qty, price });
    }
    cancelEdit();
  };

  // ---------- Batch operations ----------
  const handleSelectAll = () => {
    if (selectedItems.size === filtered.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filtered.map((_, idx) => idx)));
    }
  };

  const handleSelect = (idx) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedItems(newSelected);
  };

  const handleBatchDelete = () => {
    if (!selectedItems.size) return;
    const indicesToDelete = new Set(selectedItems);
    const newExpenses = expenses.filter((_, index) => !indicesToDelete.has(index));
    updateExpenses(newExpenses);
    setSelectedItems(new Set());
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = expenses;
    if (q) {
      rows = expenses.filter((e) => (e?.item || "").toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => {
      const va = asNumber(a?.[sortBy]);
      const vb = asNumber(b?.[sortBy]);
      if (order === "asc") return va - vb;
      return vb - va;
    });
    return rows;
  }, [expenses, query, sortBy, order]);

  // ---------- Empty state ----------
  if (!expenses.length) {
    return (
      <Paper withBorder p="lg" radius="md">
        <Stack gap="xs">
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed">No expenses recorded yet.</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      {/* Header summary */}
      <Paper withBorder p="lg" radius="md">
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <Title order={2}>Expense Analytics</Title>
            <Group gap="sm">
              <Badge size="lg" variant="light">
                {totals.totalItems} items
              </Badge>
              <Text fw={600} size="xl">
                <NumberFormatter value={totals.totalAmount} prefix="$" decimalScale={2} thousandSeparator />
              </Text>
            </Group>
          </Group>
          
          {/* Quick stats */}
          <SimpleGrid cols={{ base: 1, sm: 4 }}>
            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">Monthly Change</Text>
              <Group gap="xs" mt={4}>
                <Text size="xl" fw={700} style={{ color: trends.monthlyChange > 0 ? colors.error : colors.success }}>
                  {trends.monthlyChange > 0 ? '↑' : '↓'} 
                  <NumberFormatter value={Math.abs(trends.monthlyChange)} decimalScale={1} suffix="%" />
                </Text>
              </Group>
            </Card>
            
            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">Average per Item</Text>
              <Text size="xl" fw={700} mt={4}>
                <NumberFormatter 
                  value={totals.totalItems ? totals.totalAmount / totals.totalItems : 0} 
                  prefix="$" 
                  decimalScale={2} 
                />
              </Text>
            </Card>
            
            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">Most Active Category</Text>
              <Text size="xl" fw={700} mt={4}>
                {byCategory[0]?.category || 'N/A'}
              </Text>
            </Card>
            
            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">Monthly Average</Text>
              <Text size="xl" fw={700} mt={4}>
                <NumberFormatter 
                  value={byMonth.reduce((acc, m) => acc + m.total, 0) / (byMonth.length || 1)} 
                  prefix="$" 
                  decimalScale={2} 
                />
              </Text>
            </Card>
          </SimpleGrid>
        </Stack>
      </Paper>

      {/* Charts Section */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {/* Spending Trends */}
        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Title order={4}>Spending Trends</Title>
              <Badge 
                variant="light" 
                color={trends.trend === 'increasing' ? 'red' : trends.trend === 'decreasing' ? 'green' : 'blue'}
              >
                {trends.trend.toUpperCase()}
              </Badge>
            </Group>
            <Card withBorder radius="md" p="xs">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={byMonth}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="monthName" />
                  <YAxis />
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <Card withBorder p="xs">
                          <Stack gap={2}>
                            <Text size="sm" fw={500}>{data.monthName}</Text>
                            <Text size="xs" c="dimmed">{data.count} items</Text>
                            <Text size="sm">
                              <NumberFormatter value={data.total} prefix="$" decimalScale={2} />
                            </Text>
                          </Stack>
                        </Card>
                      );
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke={colors.primary} 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Stack>
        </Card>

        {/* Category Distribution */}
        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Title order={4}>Category Distribution</Title>
              <Group gap="xs">
                <SegmentedControl
                  size="xs"
                  value={categoryGroupBy}
                  onChange={setCategoryGroupBy}
                  data={[
                    { value: "date", label: "By Date" },
                    { value: "store", label: "By Store" }
                  ]}
                />
                <Badge variant="light">{byCategory.length} categories</Badge>
              </Group>
            </Group>
            <Card withBorder radius="md" p="xs">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {byCategory.map((entry, index) => (
                      <Cell key={entry.category} fill={colors.chart[index % colors.chart.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={(e) => {
                      if (!e.active || !e.payload?.length) {return null;}
                      const data = e.payload[0].payload;
                      const items = categoryGroupBy === 'date' ? data.dateItems : data.storeItems;

                      return (
                        <Card 
                          withBorder 
                          p="xs" 
                          style={{ 
                            maxHeight: '200px',
                            maxWidth: '200px',
                            overflowY: 'auto',
                            backgroundColor: 'white',
                            fontSize: '0.85em'
                          }}
                        >
                          <Stack gap="xs">
                            {/* Header */}
                            <Group position="apart">
                              <Text size="sm" fw={600}>{data.category}</Text>
                              <Text size="sm">
                                <NumberFormatter value={data.total} prefix="$" decimalScale={2} />
                              </Text>
                            </Group>
                            <Text size="xs" c="dimmed">{data.count} items</Text>
                            <Divider my={2} />
                            
                            {/* Items grouped by date/store */}
                            {items.map((group, idx) => (
                              <Stack key={idx} gap="xs">
                                <Group position="apart">
                                  <Text fw={500} size="sm">{group.label}</Text>
                                  <Text size="sm">
                                    <NumberFormatter value={group.total} prefix="$" decimalScale={2} />
                                  </Text>
                                </Group>
                                <Stack gap={4}>
                                  {group.items.map((item, itemIdx) => (
                                    <Group key={itemIdx} position="apart" pl="sm">
                                      <Text size="xs" c="dimmed">{item.item}</Text>
                                      <Text size="xs" c="dimmed">
                                        <NumberFormatter value={item.price} prefix="$" decimalScale={2} />
                                      </Text>
                                    </Group>
                                  ))}
                                </Stack>
                                {idx < items.length - 1 && <Divider my={4} variant="dashed" />}
                              </Stack>
                            ))}
                          </Stack>
                        </Card>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Stack>
        </Card>
      
        {/* Store Performance */}
        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Title order={4}>Store Performance</Title>
              <Badge variant="light">{byStore.length} stores</Badge>
            </Group>
            <Card withBorder radius="md" p="xs">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byStore.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="store" width={100} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <Card withBorder p="xs">
                          <Stack gap={2}>
                            <Text size="sm" fw={500}>{data.store}</Text>
                            <Text size="xs" c="dimmed">{data.count} items ({data.uniqueItems} unique)</Text>
                            <Text size="sm">
                              <NumberFormatter value={data.total} prefix="$" decimalScale={2} />
                            </Text>
                          </Stack>
                        </Card>
                      );
                    }}
                  />
                  <Bar dataKey="total" fill={colors.primary}>
                    {byStore.slice(0, 5).map((entry, index) => (
                      <Cell key={entry.store} fill={colors.chart[index % colors.chart.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Stack>
        </Card>

        {/* Monthly Category Mix */}
        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Title order={4}>Monthly Category Mix</Title>
              <Badge variant="light">Last 6 Months</Badge>
            </Group>
            <Card withBorder radius="md" p="xs">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byMonth.slice(-6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="monthName" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  {Array.from(
                    new Set(expenses.map(e => e?.category || 'Other'))
                  ).map((category, index) => (
                    <Bar 
                      key={category}
                      dataKey={(item) => item.categories.get(category)?.total || 0}
                      stackId="a"
                      fill={colors.chart[index % colors.chart.length]}
                      name={category}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Search & ranking */}
      <Paper withBorder p="lg" radius="md">
        <Stack gap="sm">
          <Group justify="space-between" wrap="wrap">
            <Group gap="xs" wrap="wrap">
              <Button 
                color="red"
                variant="light"
                disabled={selectedItems.size === 0}
                onClick={handleBatchDelete}
                leftSection={<IconTrash size={16} />}
              >
                Delete Selected ({selectedItems.size})
              </Button>
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                placeholder='Search items (e.g., "shrimp")'
                w={260}
              />
              <Select
                label="Sort by"
                value={sortBy}
                onChange={(v) => setSortBy(v || "date")}
                data={[
                  { value: "date", label: "Date" },
                  { value: "store", label: "Store" },
                  { value: "category", label: "Category" },
                  { value: "price", label: "Total Price" },
                  { value: "unitPrice", label: "Unit Price" },
                  { value: "qty", label: "Quantity" },
                  { value: "item", label: "Item Name" },
                ]}
                w={180}
              />
              <SegmentedControl
                value={order}
                onChange={setOrder}
                data={[
                  { value: "asc", label: "ASC" },
                  { value: "desc", label: "DESC" },
                ]}
              />
            </Group>
            <Tooltip label="Defaults to unit price, ASC">
              <Badge variant="outline">Search &amp; Rank</Badge>
            </Tooltip>
          </Group>

          <Divider />

          <ScrollArea>
            <Table striped highlightOnHover withRowBorders stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <Checkbox
                      checked={selectedItems.size === filtered.length}
                      indeterminate={selectedItems.size > 0 && selectedItems.size < filtered.length}
                      onChange={handleSelectAll}
                    />
                  </Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Item</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Store</Table.Th>
                  <Table.Th ta="right">Unit Price</Table.Th>
                  <Table.Th ta="right">Qty</Table.Th>
                  <Table.Th ta="right">Price</Table.Th>
                  <Table.Th ta="center" w={110}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((exp, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>
                      <Checkbox
                        checked={selectedItems.has(idx)}
                        onChange={() => handleSelect(idx)}
                      />
                    </Table.Td>
                    <Table.Td>{exp?.date || "-"}</Table.Td>
                    <Table.Td><Text fw={500}>{exp?.item || "-"}</Text></Table.Td>
                    <Table.Td>{exp?.category || "Other"}</Table.Td>
                    <Table.Td>{exp?.store || "-"}</Table.Td>
                    <Table.Td ta="right">
                      <NumberFormatter value={asNumber(exp?.unitPrice)} prefix="$" decimalScale={2} thousandSeparator />
                    </Table.Td>
                    <Table.Td ta="right">{asNumber(exp?.qty, 0)}</Table.Td>
                    <Table.Td ta="right">
                      <NumberFormatter value={asNumber(exp?.price)} prefix="$" decimalScale={2} thousandSeparator />
                    </Table.Td>
                    <Table.Td ta="center">
                      <Group gap="xs" justify="center">
                        <Tooltip label="Edit">
                          <ActionIcon variant="light" onClick={() => startEdit(idx, exp)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon color="red" variant="light" onClick={() => typeof deleteExpense === 'function' && deleteExpense(idx)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Stack>
      </Paper>
    </Stack>
  );
}
