"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createList } from "@/lib/actions/shared-list.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPicker } from "@/components/shared-lists/list-picker";
import type {
  ListVisibility,
  SharedList,
} from "@/lib/repositories/interfaces/shared-list.repository";

interface SharedListsManageProps {
  lists: SharedList[];
}

export function SharedListsManage({ lists }: SharedListsManageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [visibility, setVisibility] = useState<ListVisibility>("shared");
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<"saved" | "error" | null>(null);
  const [errorText, setErrorText] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setErrorText("");
    startTransition(async () => {
      const result = await createList({ name, visibility });
      if (result.success) {
        setNewName("");
        setMessage("saved");
        setTimeout(() => setMessage(null), 2000);
        router.refresh();
      } else {
        setErrorText(result.error);
        setMessage("error");
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-3">
        <Label className="text-xs text-muted-foreground">Scope</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={visibility === "shared" ? "default" : "outline"}
            onClick={() => setVisibility("shared")}
          >
            Shared
          </Button>
          <Button
            type="button"
            size="sm"
            variant={visibility === "personal" ? "default" : "outline"}
            onClick={() => setVisibility("personal")}
          >
            Personal
          </Button>
        </div>
      </section>
      <section>
        <h3 className="font-medium text-sm text-muted-foreground mb-3">
          Add {visibility === "shared" ? "shared" : "personal"} list
        </h3>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[200px]">
            <Label htmlFor="list-name" className="text-xs">
              Name
            </Label>
            <Input
              id="list-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Shopping"
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Add list"}
          </Button>
        </form>
      </section>

      <ListPicker
        lists={lists.filter((l) => l.visibility === visibility)}
        title={visibility === "shared" ? "Shared lists" : "Personal lists"}
      />

      {message === "saved" && (
        <p className="text-sm text-primary font-medium">Saved.</p>
      )}
      {message === "error" && errorText && (
        <p className="text-sm text-destructive">{errorText}</p>
      )}
    </div>
  );
}
