"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSplitGroup,
  updateSplitGroup,
  reorderSplitGroup,
  deleteSplitGroup,
} from "@/lib/actions/split-group.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { SplitGroup } from "@/lib/types";

interface SplitGroupsManageProps {
  groups: SplitGroup[];
}

export function SplitGroupsManage({ groups }: SplitGroupsManageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<"saved" | "error" | null>(null);
  const [errorText, setErrorText] = useState("");
  const [newName, setNewName] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIsDefault, setEditIsDefault] = useState(false);

  const startEdit = (g: SplitGroup) => {
    setEditingId(g.id);
    setEditName(g.name);
    setEditIsDefault(g.isDefault);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setErrorText("");
    startTransition(async () => {
      const result = await createSplitGroup({
        name,
        isDefault: newIsDefault,
      });
      if (result.success) {
        setNewName("");
        setNewIsDefault(false);
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
    if (!name) return;
    setErrorText("");
    startTransition(async () => {
      const result = await updateSplitGroup(editingId, {
        name,
        isDefault: editIsDefault,
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

  const handleReorder = (id: number, direction: "up" | "down") => {
    startTransition(async () => {
      const result = await reorderSplitGroup(id, direction);
      if (result.success) {
        router.refresh();
      } else {
        setErrorText(result.error ?? "Failed to reorder");
        setMessage("error");
      }
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This will fail if the group has expenses or settlements.`)) return;
    setErrorText("");
    startTransition(async () => {
      const result = await deleteSplitGroup(id);
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
        <h2 className="font-medium text-sm text-muted-foreground mb-3">Add group</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[140px]">
            <Label htmlFor="sg-name" className="text-xs">
              Name
            </Label>
            <Input
              id="sg-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Home"
              className="mt-1"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer h-9">
            <input
              type="checkbox"
              checked={newIsDefault}
              onChange={(e) => setNewIsDefault(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">Set as default</span>
          </label>
          <Button type="submit" disabled={isPending || !newName.trim()}>
            {isPending ? "Adding..." : "Add"}
          </Button>
        </form>
      </section>

      {message === "saved" && (
        <p className="text-sm text-primary font-medium">Saved.</p>
      )}
      {message === "error" && errorText && (
        <p className="text-sm text-destructive">{errorText}</p>
      )}

      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-3">Groups</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No split groups yet. Add one above.</p>
        ) : (
          <ul className="space-y-2">
            {groups.map((g, index) => (
              <li
                key={g.id}
                className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm"
              >
                {editingId === g.id ? (
                  <>
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 max-w-[200px] h-8"
                    />
                    <label className="flex items-center gap-1.5 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={editIsDefault}
                        onChange={(e) => setEditIsDefault(e.target.checked)}
                        className="rounded border-input"
                      />
                      Default
                    </label>
                    <Button size="sm" onClick={handleSaveEdit} disabled={isPending}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit} disabled={isPending}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="font-medium flex-1">{g.name}</span>
                    {g.isDefault && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Default
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleReorder(g.id, "up")}
                        disabled={isPending || index === 0}
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleReorder(g.id, "down")}
                        disabled={isPending || index === groups.length - 1}
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(g)}
                      disabled={isPending}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(g.id, g.name)}
                      disabled={isPending || g.isDefault}
                      title={g.isDefault ? "Cannot delete the default group" : "Delete"}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
