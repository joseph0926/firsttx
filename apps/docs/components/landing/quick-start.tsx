"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ShieldCheck, Sparkles, Download, Copy } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export function QuickStartSection() {
  const t = useTranslations("QuickStart");

  const installCommands = {
    pnpm: `pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx`,
    npm: `npm install @firsttx/prepaint @firsttx/local-first @firsttx/tx`,
    yarn: `yarn add @firsttx/prepaint @firsttx/local-first @firsttx/tx`,
  };

  const optionalComment = "# 선택적으로 필요한 레이어만 설치할 수도 있습니다.\n" + "pnpm add @firsttx/prepaint\n" + "pnpm add @firsttx/prepaint @firsttx/local-first\n" + "pnpm add @firsttx/local-first @firsttx/tx";

  return (
    <section id="quickstart" className="mt-20 space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{t("eyebrow")}</h2>
          <p className="text-lg font-semibold tracking-tight sm:text-xl md:text-2xl">{t("title")}</p>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <QuickChip>{t("chipSpa")}</QuickChip>
          <QuickChip>{t("chipPartial")}</QuickChip>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-stretch">
        <motion.div className="relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-background/80 via-card/80 to-card/70 p-4 shadow-[0_22px_70px_-40px_rgba(15,23,42,1)] backdrop-blur-xl sm:p-5" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6 }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-primary/18 via-transparent to-transparent" />
          <div className="relative mb-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Download className="size-3" />
              <span className="font-medium text-foreground/85">{t("installLabel")}</span>
            </span>
            <span className="rounded-full bg-secondary/80 px-2.5 py-1 text-[10px]">{t("installBadge")}</span>
          </div>
          <Tabs defaultValue="pnpm" className="relative mt-1">
            <TabsList className="inline-flex rounded-full bg-background/70 p-0.5 text-[11px]">
              <TabsTrigger value="pnpm" className="rounded-full px-3 py-1 data-[state=active]:bg-card data-[state=active]:text-foreground">
                pnpm
              </TabsTrigger>
              <TabsTrigger value="npm" className="rounded-full px-3 py-1 data-[state=active]:bg-card data-[state=active]:text-foreground">
                npm
              </TabsTrigger>
              <TabsTrigger value="yarn" className="rounded-full px-3 py-1 data-[state=active]:bg-card data-[state=active]:text-foreground">
                yarn
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pnpm" className="mt-3">
              <CodePanel code={`${installCommands.pnpm}\n\n${optionalComment}`} />
            </TabsContent>
            <TabsContent value="npm" className="mt-3">
              <CodePanel code={installCommands.npm} />
            </TabsContent>
            <TabsContent value="yarn" className="mt-3">
              <CodePanel code={installCommands.yarn} />
            </TabsContent>
          </Tabs>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <StepCard
              step="1"
              title={t("stepVite")}
              code={`
import { defineConfig } from "vite";
import { firstTx } from "@firsttx/prepaint/plugin/vite";

export default defineConfig({
  plugins: [firstTx()],
});
              `}
            />
            <StepCard
              step="2"
              title={t("stepEntry")}
              code={`
import { createFirstTxRoot } from "@firsttx/prepaint";
import App from "./App";

createFirstTxRoot(
  document.getElementById("root")!,
  <App />
);
              `}
            />
          </div>
        </motion.div>
        <motion.div className="space-y-4" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: 0.05, duration: 0.6 }}>
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-chart-1/18 via-card/85 to-card/70 p-4 text-[11px] shadow-[0_20px_60px_-44px_rgba(15,23,42,0.9)]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{t("snippetModelTitle")}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] text-muted-foreground">
                <Sparkles className="size-3 text-primary" />
                Local-First
              </span>
            </div>
            <CodePanel
              dense
              code={`import { defineModel, useSyncedModel } from "@firsttx/local-first";
import { z } from "zod";

const CartModel = defineModel("cart", {
  schema: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        qty: z.number(),
      }),
    ),
  }),
});

function CartPage() {
  const { data: cart } = useSyncedModel(
    CartModel,
    () => fetch("/api/cart").then((r) => r.json()),
  );

  if (!cart) return <Skeleton />;

  return <div>{cart.items.length} items</div>;
}`}
            />
          </div>

          {/* Tx 트랜잭션 카드 */}
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-primary/22 via-card/85 to-card/70 p-4 text-[11px] text-muted-foreground shadow-[0_20px_60px_-44px_rgba(15,23,42,0.9)]">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="size-4 text-primary" />
              {t("snippetTxTitle")}
            </p>
            <p className="mb-3 text-[11px] leading-relaxed">{t("snippetTxDescription")}</p>
            <CodePanel
              dense
              code={`import { startTransaction } from "@firsttx/tx";

async function addToCart(item: CartItem) {
  const tx = startTransaction();

  await tx.run(
    () =>
      CartModel.patch((draft) => {
        draft.items.push(item);
      }),
    {
      compensate: () =>
        CartModel.patch((draft) => {
          draft.items.pop();
        }),
    },
  );

  await tx.run(() =>
    fetch("/api/cart", {
      method: "POST",
      body: JSON.stringify(item),
    }),
  );

  await tx.commit();
}`}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function QuickChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
      <span className="size-1.5 rounded-full bg-foreground/60" />
      {children}
    </span>
  );
}

function StepCard({ step, title, code }: { step: string; title: string; code: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/90 p-3 text-[11px]">
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{step}</span>
        <p className="text-xs font-medium text-foreground">{title}</p>
      </div>
      <CodePanel dense code={code.trim()} />
    </div>
  );
}

function CodePanel({ code, dense }: { code: string; dense?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative rounded-xl border border-border/60 bg-background/95">
      <Button type="button" variant="ghost" size="icon" className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full text-[10px] text-muted-foreground hover:bg-secondary/70" onClick={handleCopy}>
        <Copy className="size-3" />
        <span className="sr-only">Copy code</span>
      </Button>
      {copied && <span className="pointer-events-none absolute top-1.5 right-8 rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] text-muted-foreground">Copied</span>}
      <pre className={`overflow-x-auto rounded-xl p-3 text-[11px] leading-relaxed ${dense ? "py-2.5" : "py-3"}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
