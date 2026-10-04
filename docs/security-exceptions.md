# 脆弱性監査の一時除外

## CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm

- 対象：braces 3.0.3 の深い入れ子のパターンによるスタック枯渇。
- 確認日：2026-10-05。次回見直し期限：2026-11-05。
- 設定：package.json の pnpm.auditConfig.ignoreCves。この CVE だけを除外し、その他の脆弱性は引き続き監査する。
- 依存経路：開発依存の eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces。
- 判断理由：公開済みの修正版がない。確認した利用箇所は ESLint が設定内のルートディレクトリを検索する処理で、アプリの入力を処理する経路ではない。このサイトは静的エクスポートを配信しており、この ESLint 用依存をサーバーとして実行しない。
- 残るリスク：脆弱性自体を修正したわけではない。信頼できない ESLint 設定・glob パターンを実行する場合や、実行時依存として利用する場合はこの判断を再評価する。
- 解除条件：修正版を取り込めた場合、または依存経路を除去できた場合に除外を削除し、pnpm audit・lint・build を再実行する。期限までに修正版が出なくても継続の妥当性を再評価する。期限による自動解除は行わない。
- 更新手順：定期 CI は除外後の監査で問題がなければ更新を省略するため、修正版公開時は手動実行の force_update を有効にする。間接依存が更新されなければ、修正版への互換性のある override を検討し、lockfile を確認する。
- 注意：自動更新 PR のブランチは定期 CI によって main から再生成されるため、この PR の手動変更はマージ前の定期実行で上書きされ得る。

参照：

- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/micromatch/braces/pull/72
