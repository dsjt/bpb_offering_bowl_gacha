// 定数定義
const BUDGET = 7;
const ACTUAL_BUDGET = BUDGET - 1; // フレイム分を除く
const HIGH_TIER_PROBABILITY = 0.9;

// 必要なヘルパー関数（既存のシミュレータから移植）

/**
 * 価格帯で分割（中央値を基準）
 */
function splitPriceTiers(items) {
    if (items.length === 0) {
        return { highTier: [], lowTier: [] };
    }

    const prices = items.map(item => item.price).sort((a, b) => a - b);
    const medianPrice = prices[Math.floor(prices.length / 2)];

    const highTier = items.filter(item => item.price >= medianPrice);
    const lowTier = items.filter(item => item.price < medianPrice);

    return { highTier, lowTier };
}

/**
 * アイテムプールのフィルタリング
 * ラウンド2を固定で使用
 */
function filterItemPool() {
    const round = 2;
    const allItems = itemsData.items;

    // レアリティフィルタ（ラウンド2のレアリティ設定を使用）
    const rarityRates = {
        "コモン": 84,
        "レア": 15,
        "エピック": 1,
        "レジェンダリ": 0,
        "ゴッド": 0
    };

    const availableRarities = Object.keys(rarityRates).filter(r => rarityRates[r] > 0);

    // ★バッジ選択を取得★
    const badges = [];
    ['badge-leaf', 'badge-skull', 'badge-wolf', 'badge-magic', 'badge-string'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            badges.push(checkbox.value);
        }
    });

    // ★特殊アイテム選択を取得★
    const specialItems = [];
    const treasureCheckbox = document.getElementById('special-treasure');
    if (treasureCheckbox && treasureCheckbox.checked) {
        specialItems.push('富の宝箱');
    }

    // 7円（実質6円）で購入可能なアイテムをフィルタ
    const filtered = allItems.filter(item => {
        // 価格フィルタ
        if (item.price > ACTUAL_BUDGET) return false;

        // レアリティフィルタ
        if (!availableRarities.includes(item.rarity)) return false;

        // 合成アイテムを除外
        if (item.crafted) return false;

        // ★特殊アイテムのフィルタリング★
        if (item.special_items && item.special_items !== false) {
            // 選択された特殊アイテムのみ含める
            if (!specialItems.includes(item.special_items)) {
                return false;
            }
        }

        // ★クラスフィルタリング★
        // バッジが選択されていない場合は "all" のみ
        if (badges.length === 0) {
            if (!item.classes.includes("all")) {
                return false;
            }
        } else {
            // バッジが選択されている場合、そのクラスまたは "all" を含める
            const hasMatchingClass = item.classes.some(cls =>
                cls === "all" || badges.includes(cls)
            );
            if (!hasMatchingClass) {
                return false;
            }
        }

        return true;
    });

    return filtered;
}

/**
 * 7円供物を1回実行（シミュレーション）
 */
function performOfferingSimulation() {
    const filteredItems = filterItemPool();
    const { highTier, lowTier } = splitPriceTiers(filteredItems);
    const allItems = [...highTier, ...lowTier];

    if (allItems.length === 0) {
        return [];
    }

    const result = [];
    let remainingBudget = ACTUAL_BUDGET;

    // フレイムを最初に追加（固定）
    const flame = itemsData.items.find(item => item.id === 308);
    if (flame) {
        result.push(flame);
    }

    while (remainingBudget > 0) {
        // 残予算で購入可能なアイテムをフィルタ
        const affordableItems = allItems.filter(item => item.price <= remainingBudget);

        if (affordableItems.length === 0) break;

        // 残予算での価格帯分割
        const { highTier: currentHigh, lowTier: currentLow } = splitPriceTiers(affordableItems);

        // 高価格帯/低価格帯を確率で選択
        const useHighTier = Math.random() < HIGH_TIER_PROBABILITY;
        const selectedTier = useHighTier ? currentHigh : currentLow;

        if (selectedTier.length === 0) {
            // 選択した価格帯にアイテムがない場合は反対側から選択
            const alternateTier = useHighTier ? currentLow : currentHigh;
            if (alternateTier.length === 0) break;

            const selectedItem = alternateTier[Math.floor(Math.random() * alternateTier.length)];
            result.push(selectedItem);
            remainingBudget -= selectedItem.price;
        } else {
            // 選択した価格帯から一様ランダムに選択
            const selectedItem = selectedTier[Math.floor(Math.random() * selectedTier.length)];
            result.push(selectedItem);
            remainingBudget -= selectedItem.price;
        }
    }

    return result;
}

/**
 * 結果を表示
 */
function displayResult(items) {
    const resultContainer = document.getElementById('result-container');
    const resultSection = document.getElementById('result-section');

    // 結果セクションを表示
    resultSection.classList.remove('hidden');
    const sortedItems = [...items].sort((a, b) => b.price - a.price);

    // アイテムカードを生成
    resultContainer.innerHTML = sortedItems.map((item, index) => {
        // アニメーション遅延
        const delay = index * 0.1;

        return `
            <div class="item-card rarity-${item.rarity}" style="animation-delay: ${delay}s">
                <div class="item-name">${item.name}</div>
                <div class="item-details">
                    <div class="item-price">${item.price}G</div>
                    <div class="item-rarity">${item.rarity}</div>
                </div>
            </div>
        `;
    }).join('');

    // 結果セクションまでスクロール
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * X (Twitter) 共有用のテキストを生成
 */
function generateShareText(items) {
    const sortedItems = [...items].sort((a, b) => b.price - a.price);
    const itemNames = sortedItems.map(item => item.name).join('、');
    const totalCost = items.reduce((sum, item) => sum + item.price, 0);

    // レアリティ集計
    const rarityCounts = {};
    items.forEach(item => {
        rarityCounts[item.rarity] = (rarityCounts[item.rarity] || 0) + 1;
    });

    const rarityText = Object.entries(rarityCounts)
        .map(([rarity, count]) => `${rarity}×${count}`)
        .join(' ');

    return `🎲 7円供物ガチャ 🎲

【獲得アイテム】
${itemNames}

合計金額: ${totalCost}G
内訳: ${rarityText}

#供物皿ガチャ
https://dsjt.github.io/bpb_offering_bowl_gacha/`;
}

/**
 * X (Twitter) で共有
 */
function shareOnTwitter(items) {
    const text = generateShareText(items);
    const encodedText = encodeURIComponent(text);
    const url = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(url, '_blank');
}

// イベントリスナー設定
let currentResult = [];

document.addEventListener('DOMContentLoaded', () => {
    // ★設定の折りたたみ機能を追加★
    const settingsToggle = document.querySelector('.settings-toggle');
    const settingsContent = document.querySelector('.settings-content');
    const toggleIcon = document.querySelector('.toggle-icon');

    settingsToggle.addEventListener('click', () => {
        settingsContent.classList.toggle('hidden');
        toggleIcon.classList.toggle('expanded');
    });

    const gachaBtn = document.getElementById('gacha-btn');
    const againBtn = document.getElementById('again-btn');
    const shareBtn = document.getElementById('share-btn');

    // ★チェックボックスのイベントリスナーを追加★
    document.querySelectorAll('[id^="badge-"], [id^="special-"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // チェックボックスが変更されたら結果をクリア
            const resultSection = document.getElementById('result-section');
            resultSection.classList.add('hidden');
            currentResult = [];
        });
    });

    // ガチャボタン
    gachaBtn.addEventListener('click', () => {
        currentResult = performOfferingSimulation();
        displayResult(currentResult);
    });

    // もう一度回すボタン
    againBtn.addEventListener('click', () => {
        currentResult = performOfferingSimulation();
        displayResult(currentResult);
    });

    // 共有ボタン
    shareBtn.addEventListener('click', () => {
        if (currentResult.length > 0) {
            shareOnTwitter(currentResult);
        }
    });
});
