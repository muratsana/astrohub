# Git / Branch / Kod Temizliği

Audit sırasında görülen remote branchler:
- main
- claude/claude-code-gorev-steps-cb2ora
- codex/product-ux-audit-20260818

Audit PR #22 kapalı ve merge edilmemiştir.

Agent:
1. git fetch --all --prune
2. Her non-main branchi main'e göre log/diff incele.
3. Gerekli benzersiz içeriği main'e güvenli biçimde taşı.
4. Sonra gereksiz remote/local branch ve stale worktree temizle.
5. Stale PR'ları kapat.
6. Final branch listesini rapora yaz.
7. Force push main yok.
