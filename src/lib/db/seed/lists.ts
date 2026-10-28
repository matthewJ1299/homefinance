import { lastInsertId, run } from "../index";
import type { SeedContext } from "./types";

export async function seedLists(ctx: SeedContext): Promise<void> {
  const { householdId, mattId, sydneyId } = ctx;

  await run(
    "INSERT INTO shared_lists (name, sort_order, visibility, owner_user_id, household_id) VALUES ('Groceries', 0, 'shared', ?, ?)",
    [mattId, householdId]
  );
  const groceriesListId = await lastInsertId();
  const groceryItems = [
    { label: "Milk 2L", quantity: 2, completed: false },
    { label: "Bread", quantity: 1, completed: true },
    { label: "Chicken breasts", quantity: 1, completed: false },
    { label: "Coffee beans", quantity: 1, completed: false },
    { label: "Avocados", quantity: 4, completed: false },
  ];
  for (let i = 0; i < groceryItems.length; i++) {
    const item = groceryItems[i]!;
    await run(
      "INSERT INTO shared_list_items (list_id, label, quantity, completed, sort_order) VALUES (?, ?, ?, ?, ?)",
      [groceriesListId, item.label, item.quantity, item.completed, i]
    );
  }

  await run(
    "INSERT INTO shared_lists (name, sort_order, visibility, owner_user_id, household_id) VALUES ('Weekend errands', 1, 'shared', ?, ?)",
    [sydneyId, householdId]
  );
  const errandsListId = await lastInsertId();
  const errandItems = [
    { label: "Post office", quantity: 1, completed: false },
    { label: "Dry cleaning", quantity: 1, completed: false },
    { label: "Car wash", quantity: 1, completed: true },
  ];
  for (let i = 0; i < errandItems.length; i++) {
    const item = errandItems[i]!;
    await run(
      "INSERT INTO shared_list_items (list_id, label, quantity, completed, sort_order) VALUES (?, ?, ?, ?, ?)",
      [errandsListId, item.label, item.quantity, item.completed, i]
    );
  }

  await run(
    "INSERT INTO shared_lists (name, sort_order, visibility, owner_user_id, household_id) VALUES ('Matt personal', 2, 'personal', ?, ?)",
    [mattId, householdId]
  );
  const personalListId = await lastInsertId();
  await run(
    "INSERT INTO shared_list_items (list_id, label, quantity, completed, sort_order) VALUES (?, ?, ?, ?, ?)",
    [personalListId, "Renew car licence", 1, false, 0]
  );

  console.log("Created shared and personal lists with items.");
}
