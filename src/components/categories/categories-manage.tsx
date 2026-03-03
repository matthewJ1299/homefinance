"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategory, updateCategory, reorderCategory, deleteCategory } from "@/lib/actions/category.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { CategoryWithActive } from "@/lib/types";

interface CategoriesManageProps {
  categories: CategoryWithActive[];
}

const DEFAULT_GROUPS = ["Living", "Bills", "Lifestyle", "Goals", "Other"];

export function CategoriesManage({ categories }: CategoriesManageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<"saved" | "error" | null>(null);
  const [errorText, setErrorText] = useState("");
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newCostType, setNewCostType] = useState<"fixed" | "variable">("variable");
  const [newDefaultAmountRands, setNewDefaultAmountRands] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [editCostType, setEditCostType] = useState<"fixed" | "variable">("variable");
  const [editDefaultAmountRands, setEditDefaultAmountRands] = useState("");

  const startEdit = (c: CategoryWithActive) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditGroup(c.groupName);
    setEditCostType(c.costType ?? "variable");
    setEditDefaultAmountRands(
      c.defaultAmount != null ? String(c.defaultAmount / 100) : ""
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const groupName = newGroup.trim();
    if (!name || !groupName) return;
    const defaultAmountCents =
      newCostType === "fixed" && newDefaultAmountRands.trim() !== ""
        ? Math.round(parseFloat(newDefaultAmountRands) * 100)
        : null;
    if (
      newCostType === "fixed" &&
      newDefaultAmountRands.trim() !== "" &&
      (Number.isNaN(defaultAmountCents) || (defaultAmountCents ?? 0) < 0)
    ) {
      setErrorText("Default amount must be a non-negative number.");
      setMessage("error");
      return;
    }
    setErrorText("");
    startTransition(async () => {
      const result = await createCategory({
        name,
        groupName,
        costType: newCostType,
        defaultAmount: newCostType === "fixed" ? defaultAmountCents : null,
      });
      if (result.success) {
        setNewName("");
        setNewGroup("");
        setNewCostType("variable");
        setNewDefaultAmountRands("");
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        router.refresh();
      } else {
        setErrorText(result.error);
        setMessage("error");
      }
    });
  };

  const handleSaveEdit = () => {
    if (editingId === null) return;
    const name = editName.trim();
    const groupName = editGroup.trim();
    if (!name || !groupName) return;
    const defaultAmountCents =
      editCostType === "fixed" && editDefaultAmountRands.trim() !== ""
        ? Math.round(parseFloat(editDefaultAmountRands) * 100)
        : null;
    if (
      editCostType === "fixed" &&
      editDefaultAmountRands.trim() !== "" &&
      (Number.isNaN(defaultAmountCents) || (defaultAmountCents ?? 0) < 0)
    ) {
      setErrorText("Default amount must be a non-negative number.");
      setMessage("error");
      return;
    }
    setErrorText("");
    startTransition(async () => {
      const result = await updateCategory(editingId, {
        name,
        groupName,
        costType: editCostType,
        defaultAmount: editCostType === "fixed" ? defaultAmountCents : null,
      });
      if (result.success) {
        setEditingId(null);
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        router.refresh();
      } else {
        setErrorText(result.error);
        setMessage("error");
      }
    });
  };

  const handleSetActive = (id: number, isActive: boolean) => {
    startTransition(async () => {
      const result = await updateCategory(id, { isActive });
      if (result.success) {
        if (editingId === id) setEditingId(null);
        router.refresh();
      } else {
        setErrorText(result.error);
        setMessage("error");
      }
    });
  };

  const handleReorder = (id: number, direction: "up" | "down") => {
    startTransition(async () => {
      const result = await reorderCategory(id, direction);
      if (result.success) {
        router.refresh();
      } else {
        setErrorText(result.error ?? "Failed to reorder");
        setMessage("error");
      }
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setErrorText("");
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.success) {
        if (editingId === id) setEditingId(null);
        router.refresh();
      } else {
        setErrorText(result.error);
        setMessage("error");
      }
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-3">Add category</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[140px]">
            <Label htmlFor="cat-name" className="text-xs">
              Name
            </Label>
            <Input
              id="cat-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Subscriptions"
              className="mt-1"
            />
          </div>
          <div className="min-w-[120px]">
            <Label htmlFor="cat-group" className="text-xs">
              Group
            </Label>
            <Input
              id="cat-group"
              type="text"
              list="group-list"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="e.g. Bills"
              className="mt-1"
            />
            <datalist id="group-list">
              {DEFAULT_GROUPS.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="cat-cost-type" className="text-xs">
              Cost type
            </Label>
            <select
              id="cat-cost-type"
              value={newCostType}
              onChange={(e) =>
                setNewCostType(e.target.value as "fixed" | "variable")
              }
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm min-w-[100px]"
            >
              <option value="variable">Variable</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          {newCostType === "fixed" && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="cat-default-amount" className="text-xs">
                Default amount (R)
              </Label>
              <Input
                id="cat-default-amount"
                type="number"
                min={0}
                step={1}
                value={newDefaultAmountRands}
                onChange={(e) => setNewDefaultAmountRands(e.target.value)}
                placeholder="e.g. 1200"
                className="w-28 mt-1 h-9"
              />
            </div>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Add"}
          </Button>
        </form>
      </section>

      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-3">Categories</h2>
        <ul className="space-y-2">
          {categories.map((c, index) => (
            <li
              key={c.id}
              className={`flex flex-wrap items-center gap-2 rounded-lg border p-3 ${
                !c.isActive ? "opacity-60 bg-muted/50" : ""
              }`}
            >
              <div className="flex flex-col shrink-0">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleReorder(c.id, "up")}
                  disabled={index === 0 || isPending}
                  aria-label={`Move ${c.name} up`}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleReorder(c.id, "down")}
                  disabled={index === categories.length - 1 || isPending}
                  aria-label={`Move ${c.name} down`}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              {editingId === c.id ? (
                <>
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-[100px] h-9"
                    placeholder="Name"
                  />
                  <Input
                    type="text"
                    value={editGroup}
                    onChange={(e) => setEditGroup(e.target.value)}
                    list="group-list-edit"
                    className="w-28 h-9"
                    placeholder="Group"
                  />
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Cost type</Label>
                    <select
                      value={editCostType}
                      onChange={(e) =>
                        setEditCostType(e.target.value as "fixed" | "variable")
                      }
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="variable">Variable</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  {editCostType === "fixed" && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Default amount (R)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={editDefaultAmountRands}
                        onChange={(e) => setEditDefaultAmountRands(e.target.value)}
                        placeholder="e.g. 1200"
                        className="w-28 h-9"
                      />
                    </div>
                  )}
                  <Button size="sm" onClick={handleSaveEdit} disabled={isPending}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-sm text-muted-foreground">({c.groupName})</span>
                  <span
                    className={`text-xs rounded px-2 py-0.5 ${
                      c.costType === "fixed"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.costType === "fixed" ? "Fixed" : "Variable"}
                  </span>
                  {c.costType === "fixed" && c.defaultAmount != null && c.defaultAmount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      R{(c.defaultAmount / 100).toLocaleString()}/mo
                    </span>
                  )}
                  {!c.isActive && (
                    <span className="text-xs rounded bg-muted px-2 py-0.5">Inactive</span>
                  )}
                  <div className="ml-auto flex gap-1 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(c)}
                      disabled={!c.isActive}
                    >
                      Edit
                    </Button>
                    {c.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetActive(c.id, false)}
                        disabled={isPending}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetActive(c.id, true)}
                          disabled={isPending}
                        >
                          Activate
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={isPending}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {message === "saved" && (
        <p className="text-sm text-primary font-medium">Saved.</p>
      )}
      {message === "error" && errorText && (
        <p className="text-sm text-destructive">{errorText}</p>
      )}
    </div>
  );
}
