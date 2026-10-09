import type { Metadata } from "next";
import { DemoConsole } from "@/components/demo/DemoConsole";

export const metadata: Metadata = { title: "Recorded demo" };

export default function DemoPage() {
  return <DemoConsole />;
}
