import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";

export function QuickStartSection() {
  const t = useTranslations("QuickStart");

  return (
    <section id="quickstart" className="mt-20 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold tracking-[0.18em] text-muted-foreground">{t("eyebrow")}</h2>
          <p className="text-xl font-medium tracking-tight sm:text-2xl">{t("title")}</p>
          <p className="max-w-xl text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
            <span className="size-1.5 rounded-full bg-foreground/60" />
            {t("chipSpa")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
            <span className="size-1.5 rounded-full bg-foreground/60" />
            {t("chipPartial")}
          </span>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-[0_22px_70px_-40px_rgba(15,23,42,1)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{t("installLabel")}</span>
            <span className="rounded-full bg-secondary/80 px-2 py-1">{t("installBadge")}</span>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-background/90 p-3 text-[11px] leading-relaxed">
            <code>
              pnpm add @firsttx/prepaint @firsttx/local-first @firsttx/tx
              {"\n"}
              {"\n"}# 또는 필요한 레이어만 선택적으로 설치
              {"\n"}
              pnpm add @firsttx/prepaint
              {"\n"}
              pnpm add @firsttx/prepaint @firsttx/local-first
              {"\n"}
              pnpm add @firsttx/local-first @firsttx/tx
            </code>
          </pre>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <StepCard
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
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-[0_20px_60px_-44px_rgba(15,23,42,0.9)]">
            <p className="mb-2 text-sm font-medium">{t("snippetModelTitle")}</p>
            <pre className="overflow-x-auto rounded-xl bg-background/90 p-3 text-[11px] leading-relaxed">
              <code>
                {`import { defineModel, useSyncedModel } from "@firsttx/local-first";
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
              </code>
            </pre>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 text-[11px] text-muted-foreground">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="size-4 text-primary" />
              {t("snippetTxTitle")}
            </p>
            <p className="mb-2">{t("snippetTxDescription")}</p>
            <pre className="overflow-x-auto rounded-xl bg-background/90 p-3 text-[11px] leading-relaxed">
              <code>
                {`import { startTransaction } from "@firsttx/tx";

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
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({ title, code }: { title: string; code: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/90 p-3 text-[11px]">
      <p className="text-xs font-medium text-foreground">{title}</p>
      <pre className="flex-1 overflow-x-auto rounded-lg bg-card/90 p-2 leading-relaxed">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}
