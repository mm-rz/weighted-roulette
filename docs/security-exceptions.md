# 脆弱性監査の例外記録

## 解除済み: CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm

- 対象だった依存：`braces@3.0.3`。現在も `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` の開発依存として解決される。
- 一時除外の追加：2026-10-05。`package.json` の `pnpm.auditConfig.ignoreCves` に、この CVE のみを登録していた。
- 見直し：2026-11-11。GitHub Advisory Database は 2026-10-23 に当該 advisory を撤回した。理由は「実用上悪用可能な脆弱性ではない」との判断であり、修正版は公開されていない。
- 対応：`pnpm.auditConfig.ignoreCves` から CVE を削除した。脆弱性の除外として維持する根拠がなくなったためである。
- 検証：依存経路を `pnpm why braces` で再確認した。除外を削除した状態で `pnpm audit` を再実行し、問題がないことを確認した。

参照：

- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/micromatch/braces/pull/72

## `pnpm.overrides` 見直し（2026-11-11）

6件の削除候補（`flatted`、`brace-expansion` 2件、`next`、`postcss`、`sharp`）を削除し、削除後に `pnpm audit` が問題なく完了することを確認した。現在は `picomatch` 2件と `minimatch` 1件を維持している。override は root の依存解決を強制するため、親パッケージの許容範囲を超えるメジャー更新を行うものは互換性リスクを持つ。

| override | 導入時期・対象 | 現在の解決版 | 見直し結果 | 次の対応 |
| --- | --- | --- | --- | --- |
| `flatted@<=3.4.1: >=3.4.2` | 2026-03-22。prototype pollution（`GHSA-rf6f-7fwh-wjgh`）。 | `3.4.4`。`flat-cache` の要求は `^3.2.9`。 | 修正版が親の許容範囲内にある。 | 2026-11-11 に削除。削除後の `pnpm audit` は成功。 |
| `brace-expansion@<1.1.13: ^1.1.21` | 2026-03-29。ゼロ刻みの範囲展開による DoS（`GHSA-f886-m6hf-6m8v`）。2026-10-05 に `minimatch` と互換な `^1.1.21` へ修正。 | `1.1.21`。`minimatch@3.1.5` の要求は `^1.1.7`。 | 修正版が親の許容範囲内にある。 | 2026-11-11 に削除。削除後の `pnpm audit` は成功。 |
| `brace-expansion@>=4.0.0 <5.0.5: >=5.0.5` | 2026-03-29。同上。 | `5.0.12`。 | 現在は脆弱な 4.x が解決されていない。 | 2026-11-11 に削除。削除後の `pnpm audit` は成功。 |
| `picomatch@<2.3.2: >=2.3.2` | 2026-03-29。POSIX 文字クラスの method injection（`GHSA-3v7f-55p6-f55p`）。 | `4.0.7`。`micromatch@4.0.8` は `^2.3.1` を要求する。 | 2.x の親要求を 4.x へ強制しており、互換性リスクがある。 | 継続中。親パッケージの更新で解消できるかを優先確認し、削除テストは単独で行う。 |
| `picomatch@>=4.0.0 <4.0.4: >=4.0.4` | 2026-03-29。同上。 | `4.0.7`。 | 現在は脆弱な 4.0.0–4.0.3 が解決されていない。 | 継続中。必要になった場合は `>=4.0.4 <5` のように上限を設ける。 |
| `next@>=16.0.0-beta.0 <16.2.3: >=16.2.3` | 2026-04-14。Server Function の DoS（`GHSA-q4gf-8mx6-v5v3`）。 | 直接依存の `16.4.6`。 | 直接依存が修正版より新しい。 | 2026-11-11 に削除。削除後の `pnpm audit` は成功。 |
| `postcss@<8.5.10: >=8.5.10` | 2026-04-30。CSS を HTML の `style` 要素へ埋め込む場合の XSS（`GHSA-qx2v-qp2m-jg93`）。 | `8.5.23`（Next.js 経由）と `8.5.32`（Tailwind 経由）。 | すべて修正版より新しい。 | 2026-11-11 に削除。削除後の `pnpm audit` は成功。 |
| `sharp@<0.35.0: >=0.35.0` | 2026-07-25。`libvips` 由来の脆弱性（`GHSA-f88m-g3jw-g9cj`）。 | `0.35.5`（Next.js 経由）。 | 修正版より新しい。 | 2026-11-11 に削除。削除後の `pnpm audit` は成功。 |
| `minimatch@>=7.0.0 <11.0.1: >=11.0.1` | 2026-11-11。glob parts の増幅による DoS（`GHSA-g3hv-75wg-m249`）。 | `11.0.6`。一方で `minimatch@3.1.5` も ESLint プラグイン経由で残る。 | 10.x の親要求を 11.x へ強制している。3.1.5 はこの advisory の対象外であり、この override では置換されない。 | 継続中。親パッケージが 11.x を要求する更新を公開したら削除する。 |

参照：

- https://github.com/advisories/GHSA-rf6f-7fwh-wjgh
- https://github.com/advisories/GHSA-f886-m6hf-6m8v
- https://github.com/micromatch/picomatch/security/advisories/GHSA-3v7f-55p6-f55p
- https://github.com/vercel/next.js/security/advisories/GHSA-q4gf-8mx6-v5v3
- https://github.com/advisories/GHSA-qx2v-qp2m-jg93
- https://github.com/advisories/GHSA-f88m-g3jw-g9cj
- https://github.com/advisories/GHSA-g3hv-75wg-m249
