// src/features/expenses/pages/BulkImport.js
import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Paper,
  Title,
  Stack,
  Textarea,
  Button,
  Group,
  Table,
  Text,
  Alert,
  Divider,
  NumberFormatter,
} from "@mantine/core";
// import { IconAlertCircle } from "@tabler/icons-react";

const SUMMARY_ROWS = [
  "SUBTOTAL",
  "SALES TAX",
  "TAX",
  "TOTAL",
  "CASH",
  "CASH PAID",
  "CHANGE",
];

function parseCurrency(str) {
  if (!str) return 0;
  // remove $ , ** and spaces
  const clean = String(str).replace(/\*/g, "").replace(/[\$,]/g, "").trim();
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parses unit price like:
 *  - "$3.77 each"  => { pricePerUnit: 3.77, unit: "each" }
 *  - "$10.99 / lb" => { pricePerUnit: 10.99, unit: "lb" }
 *  - "3.50"        => { pricePerUnit: 3.5, unit: "each" } (fallback)
 */
function parseUnitPrice(s) {
  if (!s) return { pricePerUnit: 0, unit: "each" };
  const raw = s.replace(/\*/g, "").trim().toLowerCase();
  const price = parseCurrency(raw);
  const isLb = /\/\s*lb/.test(raw) || /\bper\s*lb\b/.test(raw);
  const isEach = /\beach\b/.test(raw);
  return {
    pricePerUnit: price,
    unit: isLb ? "lb" : isEach ? "each" : "each",
  };
}

/**
 * Parses qty like:
 *  - "1"        => { qty: 1, unit: "each" }
 *  - "0.560 lb" => { qty: 0.56, unit: "lb" }
 *  - "1 lb"     => { qty: 1, unit: "lb" }
 */
function parseQty(s) {
  if (!s) return { qty: 0, unit: "each" };
  const raw = s.replace(/\*/g, "").trim().toLowerCase();
  const match = raw.match(/([\d.]+)/);
  const qty = match ? parseFloat(match[1]) : 0;
  const isLb = /\blb\b/.test(raw);
  return { qty: Number.isFinite(qty) ? qty : 0, unit: isLb ? "lb" : "each" };
}

// Detects and skips bold summary rows like **SUBTOTAL**
function isSummaryRow(itemCell) {
  if (!itemCell) return false;
  const normalized = itemCell.replace(/\*/g, "").trim().toUpperCase();
  return SUMMARY_ROWS.some((k) => normalized.startsWith(k));
}

// Splits a markdown line into cells, trimming pipes and whitespace
function splitRow(line) {
  // remove leading/trailing pipes then split
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

/**
 * Parse a GitHub-style Markdown table into expense rows.
 * Expected headers (case-insensitive):
 *  Item | Category | Store | Date | Unit Price | (Weight/Qty|Qty) | Price
 */
function parseMarkdownTable(md) {
  const lines = md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return { rows: [], errors: ["No markdown table found."] };

  // Find header row (first line with pipes and without alignment dashes)
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/\|/.test(lines[i]) && !/^-+/.test(lines[i].replace(/\|/g, "").trim())) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return { rows: [], errors: ["Header row not found."] };

  const header = splitRow(lines[headerIdx]).map((h) => h.replace(/\*/g, "").toLowerCase());
  const body = lines.slice(headerIdx + 1);

  // Skip the next line if it's an alignment row (---|---)
  const startBody =
    body.length && /^[:\-\s\|]+$/.test(body[0].replace(/\s/g, ""))
      ? body.slice(1)
      : body;

  // Map header indexes
  const idx = (nameVariants) => {
    for (const n of nameVariants) {
      const i = header.findIndex((h) => h.includes(n));
      if (i !== -1) return i;
    }
    return -1;
  };

  const iItem = idx(["item"]);
  const iCategory = idx(["category"]);
  const iStore = idx(["store"]);
  const iDate = idx(["date"]);
  const iUnitPrice = idx(["unit price", "unitprice", "price per", "per"]);
  const iQty = idx(["weight/qty", "qty", "weight", "amount"]);
  const iPrice = idx(["price", "total"]);

  const requiredMissing = [];
  if (iItem === -1) requiredMissing.push("Item");
  if (iDate === -1) requiredMissing.push("Date");
  if (iUnitPrice === -1) requiredMissing.push("Unit Price");
  if (iQty === -1) requiredMissing.push("Weight/Qty or Qty");

  const errors = [];
  if (requiredMissing.length) {
    errors.push(`Missing required columns: ${requiredMissing.join(", ")}`);
  }

  const rows = [];
  startBody.forEach((line, lineIdx) => {
    if (!/\|/.test(line)) return;
    const cells = splitRow(line);
    const get = (i) => (i >= 0 && i < cells.length ? cells[i] : "");

    const itemCell = get(iItem);
    if (isSummaryRow(itemCell)) return; // skip summary lines

    const item = itemCell.replace(/\*\*/g, "").trim();
    if (!item) return;

    const category = (get(iCategory) || "Other").replace(/\*\*/g, "").trim();
    const store = (get(iStore) || "").replace(/\*\*/g, "").trim();
    const date = (get(iDate) || "").replace(/\*\*/g, "").trim();

    const { pricePerUnit, unit: unitPriceUnit } = parseUnitPrice(get(iUnitPrice));
    const qtyParsed = parseQty(get(iQty));
    const unitMismatch =
      unitPriceUnit === "lb" && qtyParsed.unit !== "lb" ? "lb"
      : unitPriceUnit === "each" && qtyParsed.unit !== "each" ? "each"
      : null;

    const qty =
      unitMismatch === "lb" ? 0 // force error; can't price by lb but have "each"
      : unitMismatch === "each" ? 0
      : qtyParsed.qty;

    const priceCell = get(iPrice);
    const explicitPrice = parseCurrency(priceCell);
    const price =
      explicitPrice > 0
        ? explicitPrice
        : Number.isFinite(pricePerUnit * qty)
        ? +(pricePerUnit * qty).toFixed(2)
        : 0;

    // Basic validation
    const rowErrors = [];
    if (!date) rowErrors.push("Missing date");
    if (pricePerUnit <= 0) rowErrors.push("Invalid unit price");
    if (qty <= 0) rowErrors.push("Invalid qty/weight");
    if (unitMismatch)
      rowErrors.push(
        `Qty unit (${qtyParsed.unit}) doesn't match unit price (${unitPriceUnit})`
      );

    if (rowErrors.length) {
      errors.push(`Row ${lineIdx + 1}: ${rowErrors.join("; ")}`);
    }

    rows.push({
      item,
      category,
      store,
      date, // yyyy-mm-dd or whatever was pasted
      unitPrice: +pricePerUnit.toFixed(2),
      qty: +qty.toFixed(3),
      price: +price.toFixed(2),
      pricingUnit: unitPriceUnit, // "each" or "lb" (for reference)
    });
  });

  return { rows, errors };
}

export default function BulkImport() {
  
  const [md, setMd] = useState("");
  const [parsed, setParsed] = useState({ rows: [], errors: [] });
  const { importRows } = useOutletContext();

  const totals = useMemo(() => {
    const sum = parsed.rows.reduce((acc, r) => acc + (r.price || 0), 0);
    return +sum.toFixed(2);
  }, [parsed.rows]);

  const handleParse = () => {
    const res = parseMarkdownTable(md);
    setParsed(res);
  };

  const handleClear = () => {
    setMd("");
    setParsed({ rows: [], errors: [] });
  };

  const handleImport = () => {
      importRows(parsed.rows);
      handleClear();
  };

  return (
    <Paper withBorder p="lg" radius="md">
      <Stack gap="md">
        <Title order={2}>Bulk Import</Title>

        <Textarea
          label="Paste Markdown table"
          description="Paste a GitHub-style Markdown table of expenses. Summary lines like SUBTOTAL/TAX/TOTAL are ignored."
          placeholder="| Item | Category | Store | Date | Unit Price | Weight/Qty | Price |"
          autosize
          minRows={8}
          value={md}
          onChange={(e) => setMd(e.currentTarget.value)}
        />

        <Group>
          <Button onClick={handleParse}>Preview</Button>
          <Button variant="light" color="gray" onClick={handleClear}>
            Clear
          </Button>
          <Button
            color="green"
            disabled={!parsed.rows.length}
            onClick={handleImport}
          >
            Import {parsed.rows.length ? `(${parsed.rows.length})` : ""}
          </Button>
        </Group>

        {!!parsed.errors.length && (
          <Alert
            color="yellow"
            title="Some rows need attention"
          >
            <Stack gap={4}>
              {parsed.errors.map((e, i) => (
                <Text key={i} size="sm">
                  • {e}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        {parsed.rows.length > 0 && (
          <>
            <Divider my="xs" />
            <Title order={4}>Preview</Title>
            <Table striped highlightOnHover withRowBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Item</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Store</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th ta="right">Unit Price</Table.Th>
                  <Table.Th ta="right">Qty</Table.Th>
                  <Table.Th ta="right">Price</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {parsed.rows.map((r, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>{r.item}</Table.Td>
                    <Table.Td>{r.category}</Table.Td>
                    <Table.Td>{r.store}</Table.Td>
                    <Table.Td>{r.date}</Table.Td>
                    <Table.Td ta="right">
                      <NumberFormatter
                        value={r.unitPrice}
                        prefix="$"
                        decimalScale={2}
                        thousandSeparator
                      />
                      {r.pricingUnit === "lb" ? " / lb" : " each"}
                    </Table.Td>
                    <Table.Td ta="right">{r.qty}</Table.Td>
                    <Table.Td ta="right">
                      <NumberFormatter
                        value={r.price}
                        prefix="$"
                        decimalScale={2}
                        thousandSeparator
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
              <Table.Tfoot>
                <Table.Tr>
                  <Table.Th colSpan={6} ta="right">
                    Total
                  </Table.Th>
                  <Table.Th ta="right">
                    <NumberFormatter
                      value={totals}
                      prefix="$"
                      decimalScale={2}
                      thousandSeparator
                    />
                  </Table.Th>
                </Table.Tr>
              </Table.Tfoot>
            </Table>
          </>
        )}
      </Stack>
    </Paper>
  );
}