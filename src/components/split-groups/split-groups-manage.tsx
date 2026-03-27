"use client";

import { useCallback, useState, useTransition } from "react";
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
import { usePropSyncedState } from "@/hooks/use-prop-synced-state";
import { toast } from "sonner";

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
  const [groupsState, setGroupsState] = usePropSyncedState(groups);

  const optimisticRemoveGroup = useCallback(
    (groupId: number) => {
      const snapshot = groupsState;
      setGroupsState((prev) => prev.filter((g) => g.id !== groupId));
      return () => setGroupsState(snapshot);
    },
    [groupsState, setGroupsState]
  );

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
    const tempId = -Date.now();
    const snapshot = groupsState;
    setGroupsState((prev) => [
      ...prev,
      { id: tempId, name, isDefault: newIsDefault, sortOrder: prev.length + 1 },
    ]);
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
        if (result.id != null) {
          setGroupsState((prev) => prev.map((g) => (g.id === tempId ? { ...g, id: result.id! } : g)));
        }
        toast.success("Split group created.");
        void router.refresh();
      } else {
        setGroupsState(snapshot);
        setErrorText(result.error);
        setMessage("error");
        toast.error(result.error);
      }
    });
  };

  const handleSaveEdit = () => {
    if (editingId === null) return;
    const name = editName.trim();
    if (!name) return;
    setErrorText("");
    const snapshot = groupsState;
    setGroupsState((prev) => prev.map((g) => (g.id === editingId ? { ...g, name, isDefault: editIsDefault } : g)));
    startTransition(async () => {
      const result = await updateSplitGroup(editingId, {
        name,
        isDefault: editIsDefault,
      });
      if (result.success) {
        setEditingId(null);
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        toast.success("Split group updated.");
        void router.refresh();
      } else {
        setGroupsState(snapshot);
        setErrorText(result.error);
        setMessage("error");
        toast.error(result.error);
      }
    });
  };

  const handleReorder = (id: number, direction: "up" | "down") => {
    const snapshot = groupsState;
    setGroupsState((prev) => {
      const idx = prev.findIndex((g) => g.id === id);
      if (idx === -1) return prev;
      const nextIdx = direction === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[idx]!;
      copy[idx] = copy[nextIdx]!;
      copy[nextIdx] = tmp;
      return copy;
    });
    startTransition(async () => {
      const result = await reorderSplitGroup(id, direction);
      if (result.success) {
        toast.success("Split groups reordered.");
        void router.refresh();
      } else {
        setGroupsState(snapshot);
        setErrorText(result.error ?? "Failed to reorder");
        setMessage("error");
        toast.error(result.error ?? "Failed to reorder split groups.");
      }
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This will fail if the group has expenses or settlements.`)) return;
    setErrorText("");
    const rollback = optimisticRemoveGroup(id);
    startTransition(async () => {
      const result = await deleteSplitGroup(id);
      if (result.success) {
        if (editingId === id) setEditingId(null);
        toast.success("Split group deleted.");
        void router.refresh();
      } else {
        rollback();
        setErrorText(result.error);
        setMessage("error");
        toast.error(result.error);
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
        {groupsState.length === 0 ? (
          <p className="text-sm text-muted-foreground">No split groups yet. Add one above.</p>
        ) : (
          <ul className="space-y-2">
            {groupsState.map((g, index) => (
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
