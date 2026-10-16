"use client"

import { useMemo, useState } from "react"
import { parseCsv } from "../lib/csv"
import { applyWeightExpression } from "../lib/expression"
import { buildRouletteSegments, pickWeighted } from "../lib/roulette"
import RouletteWheel from "../components/RouletteWheel"

type RouletteMode = "instant" | "animated"

const SAMPLE_CSV = `A, 10
B, 20
C, 15`

export default function Page() {
  const [csvText, setCsvText] = useState(SAMPLE_CSV)
  const [expression, setExpression] = useState("x")
  const [mode, setMode] = useState<RouletteMode>("instant")
  const [result, setResult] = useState<string>("")
  const [pickError, setPickError] = useState("")
  const [fileError, setFileError] = useState("")
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinRotation, setSpinRotation] = useState(0)

  const parsed = useMemo(() => {
    return parseCsv(csvText)
  }, [csvText])

  const handleCsvFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError("")

    try {
      const text = await file.text()
      setCsvText(text)
      setResult("")
    } catch {
      setFileError("CSVファイルの読み込みに失敗しました")
    } finally {
      e.target.value = ""
    }
  }

  const preview = useMemo(() => {
    if (!parsed.ok) return { ok: false as const, error: parsed.error }

    const rows = []

    for (const item of parsed.items) {
      const result = applyWeightExpression(expression, item.weight)

      if (!result.ok) {
        return { ok: false as const, error: result.error }
      }

      if (result.value <= 0) continue

      rows.push({
        ...item,
        adjustedWeight: result.value,
      })
    }

    if (rows.length === 0) {
      return {
        ok: false as const,
        error: "重みが 0 より大きい要素がありません",
      }
    }

    return { ok: true as const, rows }
  }, [parsed, expression])

  const startSpin = (
    entries: { item: { id: number; name: string }; weight: number }[],
    pickedId: number
  ) => {
    const segments = buildRouletteSegments(entries)
    const target = segments.find((segment) => segment.item.id === pickedId)

    if (!target) {
      setPickError("当選項目の位置計算に失敗しました")
      return
    }

    setIsSpinning(true)

    
    const segmentWidth = target.endAngle - target.startAngle
    const randomAngleInSegment = target.startAngle + Math.random() * segmentWidth
    
    // 扇形の中央が真上の針に来るように回す
    const targetRotation = -randomAngleInSegment

    // 何周か回してから止める
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 5))
    
    const currentNormalized = ((spinRotation % 360) + 360) % 360
    const targetNormalized = ((targetRotation % 360) + 360) % 360

    let delta = targetNormalized - currentNormalized
    if (delta < 0) {
      delta += 360
    }

    const finalRotation = spinRotation + extraSpins + delta

    setSpinRotation(finalRotation)

    setTimeout(() => {
      const pickedItem = entries.find((entry) => entry.item.id === pickedId)
      setResult(pickedItem?.item.name ?? "")
      setIsSpinning(false)
    }, 3000)
  }

  const handlePick = () => {
    setPickError("")

    if (!preview.ok) {
      setResult("")
      setPickError(preview.error)
      return
    }

    const weightedEntries = preview.rows.map((row) => ({
      item: row,
      weight: row.adjustedWeight,
    }))

    const picked = pickWeighted(weightedEntries)

    if (!picked.ok) {
      setResult("")
      setPickError(picked.error)
      return
    }

    if (mode === "instant") {
      setResult(picked.value.name)
      return
    }

    startSpin(weightedEntries, picked.value.id)
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">重み付きルーレット</h1>
          <p className="mt-2 text-sm text-slate-600">
            重み付きのルーレットです
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* 左カラム: 入力 */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">入力</h2>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">
                CSV形式のテキスト
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="h-64 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm outline-none transition focus:border-slate-500"
                placeholder={"[名前], [重み]\nA, 10\nB, 20"}
              />
              <p className="mt-2 text-xs text-slate-500">
                1行につき「[名前], [重み]」の形式で入力します。
              </p>
              <p className="mt-2 text-xs text-slate-500">
                [名前] にカンマ "," を含めたい場合は、ダブルクオーテーション &quot;&quot; で囲んでください。例: &quot;Osaka, Japan&quot;, 5
              </p>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">
                CSVファイル
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileChange}
                className="block w-full text-sm"
              />
              <p className="mt-2 text-xs text-slate-500">
                あるいは上記の形式の CSV ファイルを選択することで入力できます。
              </p>
              {fileError && (
                <p className="mt-2 text-xs text-red-600">{fileError}</p>
              )}
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">
                重み変換式
              </label>
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm outline-none transition focus:border-slate-500"
                placeholder="x"
              />
              <p className="mt-2 text-xs text-slate-500">
                各種重みに対して、一律で変換を行うことができます。
                </p>
              <p className="mt-2 text-xs text-slate-500">
                例: x / x*2 / max(0, 100-x*0.2)
              </p>
            </div>

            <div className="mb-6">
              <span className="mb-2 block text-sm font-medium">抽選モード</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode("instant")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    mode === "instant"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  瞬時に結果表示
                </button>

                <button
                  type="button"
                  onClick={() => setMode("animated")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    mode === "animated"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  アニメーション付きで結果表示
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePick}
              disabled={isSpinning}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              抽選
            </button>

          </section>

          <div className="grid gap-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">抽選結果</h2>
              {mode === "animated" && preview.ok && (
                <div className="flex justify-center my-8">
                  <RouletteWheel
                    rows={preview.rows}
                    rotation={spinRotation}
                  />
                  </div>
              )}
              <div className="flex min-h-32 items-center justify-center rounded-2xl bg-slate-100 p-6">
                {pickError && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    {pickError}
                  </div>
                )}
                {result ? (
                  <div className="text-center">
                    <p className="mb-2 text-sm text-slate-500">選ばれた項目</p>
                    <p className="text-3xl font-bold">{result}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    まだ抽選していません。
                  </p>
                )}
              </div>
            </section>
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">候補プレビュー</h2>
              
              {!parsed.ok && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {parsed.error}
                </div>
              )}

              {!preview.ok && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {preview.error}
                </div>
              )}
              
              {parsed.ok &&  parsed.items.length === 0 ? (
                <p className="text-sm text-slate-500">候補がありません</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full overflow-hidden rounded-xl border border-slate-200 text-sm">

                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b px-4 py-3 text-left">名前</th>
                      <th className="border-b px-4 py-3 text-left">元重み</th>
                      <th className="border-b px-4 py-3 text-left">変換後重み</th>
                    </tr>
                  </thead>

                  <tbody>

                  {preview.ok && (preview.rows.map((item) => (
                    <tr key={item.id} className="odd:bg-white even:bg-slate-50">

                    <td className="border-b px-4 py-3">
                      {item.name}
                    </td>

                    <td className="border-b px-4 py-3 font-mono">
                      {item.weight}
                    </td>

                    <td className="border-b px-4 py-3 font-mono">
                      {item.adjustedWeight === 0 ? 0 : item.adjustedWeight.toFixed(3)}
                    </td>

                    </tr>

                  )))}

                  </tbody>

                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">現在の設定</h2>
              <dl className="grid gap-3 text-sm">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                  <dt className="text-slate-500">変換式</dt>
                  <dd className="font-mono">{expression}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                  <dt className="text-slate-500">抽選モード</dt>
                  <dd>{mode === "instant" ? "瞬時表示" : "アニメーション表示"}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">候補数</dt>
                  <dd>{preview.ok ? preview.rows.length : -1}</dd>
                </div>
              </dl>
            </section>

          </div>
        </div>
      </div>
    </main>
  )
}
