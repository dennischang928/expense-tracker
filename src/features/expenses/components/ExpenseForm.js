import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import {
  TextInput,
  NumberInput,
  Button,
  Group,
  Title,
  Stack,
  Select,
  Grid,
  Paper,
} from "@mantine/core";

const categories = [
  // 🛒 Food & Groceries
  "Food / Pantry",
  "Snacks",
  "Beverages",
  "Coffee / Tea",
  "Alcohol",
  "Dairy",
  "Meat & Poultry",
  "Seafood",
  "Produce (Fruits & Vegetables)",
  "Frozen Foods",
  "Bakery / Bread",
  "Condiments & Spices",
  "Canned & Packaged Goods",

  // 🏠 Household & Living
  "Cleaning Supplies",
  "Paper Goods",
  "Kitchen Supplies",
  "Laundry Supplies",
  "Furniture",
  "Home Décor",
  "Small Appliances",
  "Bedding & Linens",
  "Tools & Hardware",

  // 🧼 Personal Care & Health
  "Toiletries",
  "Skincare",
  "Haircare",
  "Cosmetics / Makeup",
  "Personal Hygiene",
  "Medications (OTC)",
  "Prescription Medicine",
  "Vitamins & Supplements",
  "Fitness & Exercise",

  // 👕 Clothing & Accessories
  "Clothing",
  "Footwear",
  "Bags & Accessories",
  "Jewelry / Watches",
  "Laundry / Dry Cleaning",

  // 🎮 Entertainment & Leisure
  "Subscriptions",
  "Books & Magazines",
  "Games & Apps",
  "Hobbies & Crafts",
  "Sports & Outdoor",
  "Movies / Concerts / Events",

  // 🚗 Transportation
  "Fuel / Gas",
  "Public Transit",
  "Ride Sharing",
  "Parking & Tolls",
  "Vehicle Maintenance & Repairs",
  "Car Insurance",
  "Car Loan / Lease",

  // 🏠 Housing & Utilities
  "Rent / Mortgage",
  "Electricity",
  "Water & Sewer",
  "Gas / Heating",
  "Internet",
  "Mobile Phone",
  "Cable / Streaming",
  "Trash / Recycling",

  // 🍽️ Dining & Social
  "Restaurants",
  "Fast Food",
  "Cafés",
  "Bars & Nightlife",
  "Delivery / Takeout",

  // 🧾 Financial & Professional
  "Banking Fees",
  "Credit Card Payments",
  "Loan Repayments",
  "Investments",
  "Insurance",
  "Professional Fees",
  "Trade Subscriptions",

  // 🧳 Travel
  "Flights",
  "Hotels / Accommodation",
  "Taxis / Shuttles",
  "Rental Cars",
  "Travel Insurance",
  "Tours & Attractions",
  "Souvenirs",

  // 🎓 Education
  "Tuition",
  "Books & Study Materials",
  "Online Courses",
  "School Supplies",
  "Software / Tools",

  // 🐾 Pets
  "Pet Food",
  "Pet Supplies",
  "Veterinary Care",
  "Grooming",
  "Pet Insurance",

  // 💝 Family & Relationships
  "Childcare",
  "Baby Supplies",
  "Allowances / Gifts",
  "Holidays / Celebrations",

  // 💻 Technology
  "Electronics",
  "Accessories",
  "Software Licenses",
  "Cloud Services",
  "Repairs",

  // 🏥 Healthcare
  "Doctor Visits",
  "Dentist",
  "Vision / Eyewear",
  "Therapy / Counseling",

  // 🛠️ Miscellaneous
  "Donations & Charity",
  "Taxes",
  "Postage & Shipping",
  "Emergency Fund",
  "Miscellaneous",
  "Other",
];



export default function ExpenseForm() {

  const [item, setItem] = useState("");
  const [category, setCategory] = useState("");
  const [store, setStore] = useState("");
  const [date, setDate] = useState(""); // yyyy-mm-dd (native)
  const [unitPrice, setUnitPrice] = useState(0);
  const [qty, setQty] = useState(1);

  const { addExpense } = useOutletContext();
  // Mantine NumberInput onChange can return string | number depending on version,
  // so we normalize to a number safely:
  const num = (v) => (typeof v === "number" ? v : parseFloat(v || "0"));

  const total = useMemo(() => {
    const t = num(unitPrice) * num(qty);
    return Number.isFinite(t) ? t : 0;
  }, [unitPrice, qty]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      item: item.trim(),
      category: category || "Other",
      store: store.trim(),
      date, // yyyy-mm-dd
      unitPrice: +num(unitPrice).toFixed(2),
      qty: +num(qty),
      price: +total.toFixed(2),
    };

    // Hand off to parent if provided, else just log
    console.log("Expense added:", payload); 
    if (addExpense) addExpense(payload);
    else console.log("Expense added:", payload);

    // Reset a few fields (keep date/category if you prefer)
    setItem("");
    setStore("");
    setUnitPrice(0);
    setQty(1);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          <Title order={2}>Add Expense</Title>

          <Grid>
            <Grid.Col span={{ base: 12, sm: 8 }}>
              <TextInput
                label="Item"
                placeholder="e.g., Kosher Salt 16 oz"
                value={item}
                onChange={(e) => setItem(e.currentTarget.value)}
                required
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Select
                label="Category"
                data={categories}
                placeholder="Select category"
                value={category}
                onChange={setCategory}
                searchable
                clearable
                nothingFoundMessage="No options"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Store"
                placeholder="e.g., Dollar Tree"
                value={store}
                onChange={(e) => setStore(e.currentTarget.value)}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.currentTarget.value)}
                required
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Unit Price"
                placeholder="e.g., 1.25"
                min={0}
                step={0.01}
                value={unitPrice}
                onChange={(v) => setUnitPrice(num(v))}
                allowDecimal
                clampBehavior="strict"
                thousandSeparator=","
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Qty"
                placeholder="e.g., 1"
                min={0}
                step={1}
                value={qty}
                onChange={(v) => setQty(num(v))}
                allowDecimal={false}
                clampBehavior="strict"
                thousandSeparator=","
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                label="Price"
                value={total.toFixed(2)}
                readOnly
                description="Auto-calculated: Unit Price × Qty"
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-start" mt="xs">
            <Button type="submit" variant="filled" color="blue">
              Add Expense
            </Button>
          </Group>
        </Stack>
      </Paper>
    </form>
  );
}