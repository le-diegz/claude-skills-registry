"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface CustomerOption {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
}

export function CustomerCombobox({
  customers,
  value,
  onSelect,
  onCreate,
  invalid,
}: {
  customers: CustomerOption[];
  value: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = customers.find((c) => c.id === value);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const list = q
      ? customers.filter((c) =>
          [c.name, c.company_name, c.email, c.phone]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .includes(q),
        )
      : customers;
    return list.slice(0, 50);
  }, [customers, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className="w-full justify-between font-normal"
          data-testid="customer-combobox"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? (selected.company_name ? `${selected.name} · ${selected.company_name}` : selected.name) : "Rechercher ou créer un client…"}
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Nom, email, téléphone…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">Aucun client trouvé.</CommandEmpty>
            {search.trim().length > 0 && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${search}`}
                  onSelect={() => {
                    onCreate(search.trim());
                    setOpen(false);
                    setSearch("");
                  }}
                  className="text-primary"
                >
                  <Plus /> Créer le client « {search.trim()} »
                </CommandItem>
              </CommandGroup>
            )}
            {filtered.length > 0 && (
              <CommandGroup heading="Clients">
                {filtered.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      onSelect(c.id);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{c.name}{c.company_name ? <span className="text-muted-foreground"> · {c.company_name}</span> : null}</div>
                      {(c.email || c.phone) && <div className="truncate text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ")}</div>}
                    </div>
                    <Check className={cn("size-4", value === c.id ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {search.trim().length === 0 && (
              <CommandGroup>
                <CommandItem value="__create_empty__" onSelect={() => { onCreate(""); setOpen(false); }} className="text-primary">
                  <Plus /> Nouveau client
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
