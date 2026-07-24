import argparse
import json
import os
import warnings
from collections import Counter

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd

warnings.filterwarnings('ignore')

plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False


def parse_args():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    parser = argparse.ArgumentParser(description='为 0.4.0 版本的 SGS 统计日志生成可视化图表')
    parser.add_argument('--input', default=os.path.join(script_dir, 'log.json'), help='输入 JSON 文件路径')
    parser.add_argument('--output-dir', default=os.path.join(script_dir, 'visualization_output'), help='输出图片目录')
    return parser.parse_args()


def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return default


def get_nested(mapping, *keys):
    current = mapping
    for key in keys:
        if not isinstance(current, dict) or key not in current:
            return None
        current = current[key]
    return current


def pick_first(*values):
    for value in values:
        if value not in (None, '', [], {}):
            return value
    return None


def load_data(path):
    if not os.path.exists(path):
        fallback = os.path.join(os.path.dirname(path), 'log07170856.json')
        if os.path.exists(fallback):
            path = fallback
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def normalize_name(item, fallback='unknown'):
    if isinstance(item, str):
        return item or fallback
    if not isinstance(item, dict):
        return fallback
    if item.get('name'):
        return item['name']
    if isinstance(item.get('goods'), dict) and item['goods'].get('name'):
        return item['goods']['name']
    if item.get('cardName'):
        return item['cardName']
    if item.get('spellName'):
        return item['spellName']
    return fallback


def extract_refresh_events(data):
    refresh_events = []
    totals_refresh = get_nested(data, 'totals', 'refresh', 'details') or []
    if totals_refresh:
        for event in totals_refresh:
            payload = event.get('payload', {}) if isinstance(event, dict) and 'payload' in event else event
            refresh_events.append({
                'at': event.get('at') or payload.get('at'),
                'round': safe_int(pick_first(payload.get('round'), event.get('round')), 0),
                'cost': safe_int(pick_first(payload.get('cost'), event.get('cost')), 0),
                'is_auto': bool(pick_first(payload.get('isAuto'), event.get('isAuto'), False)),
                'phase': safe_int(pick_first(payload.get('phase'), event.get('phase')), 0),
            })
        return refresh_events

    for event in data.get('events', []):
        if event.get('type') != 'refresh':
            continue
        payload = event.get('payload', {})
        refresh_events.append({
            'at': event.get('at'),
            'round': safe_int(payload.get('round'), 0),
            'cost': safe_int(payload.get('cost'), 0),
            'is_auto': bool(payload.get('isAuto', False)),
            'phase': safe_int(payload.get('phase'), 0),
        })
    return refresh_events


def extract_buy_events(data):
    buy_events = []
    totals_buy = get_nested(data, 'totals', 'buy', 'details') or []
    if totals_buy:
        for event in totals_buy:
            payload = event.get('payload', {}) if isinstance(event, dict) and 'payload' in event else event
            goods = payload.get('goods', {}) or event.get('goods', {}) or {}
            buy_events.append({
                'at': event.get('at') or payload.get('at'),
                'round': safe_int(pick_first(payload.get('round'), event.get('round')), 0),
                'cost': safe_int(pick_first(payload.get('cost'), event.get('cost')), 0),
                'goods_name': normalize_name(goods, fallback=goods.get('name', 'unknown')),
                'goods_id': safe_int(goods.get('chessID') or goods.get('cardID') or goods.get('goodsID'), 0),
                'phase': safe_int(pick_first(payload.get('phase'), event.get('phase')), 0),
            })
        return buy_events

    for event in data.get('events', []):
        if event.get('type') != 'buy':
            continue
        payload = event.get('payload', {})
        goods = payload.get('goods', {}) or {}
        buy_events.append({
            'at': event.get('at'),
            'round': safe_int(payload.get('round'), 0),
            'cost': safe_int(payload.get('cost'), 0),
            'goods_name': normalize_name(goods, fallback=goods.get('name', 'unknown')),
            'goods_id': safe_int(goods.get('chessID') or goods.get('cardID') or goods.get('goodsID'), 0),
            'phase': safe_int(payload.get('phase'), 0),
        })
    return buy_events


def extract_spell_events(data):
    spell_events = []
    for event in data.get('events', []):
        if event.get('type') != 'spell':
            continue
        payload = event.get('payload', {})
        spell = pick_first(payload.get('spell'), payload.get('goods'), payload.get('card'), payload.get('item')) or {}
        spell_events.append({
            'at': event.get('at'),
            'round': safe_int(payload.get('round'), 0),
            'name': normalize_name(spell, fallback='unknown'),
            'spell_id': safe_int(spell.get('spellID') or spell.get('cardID') or spell.get('chessID') or spell.get('goodsID'), 0),
        })
    return spell_events


def collect_appearances(data):
    for key in ['shopAppearances', 'appearances']:
        value = data.get(key)
        if isinstance(value, dict) and value:
            return value
    totals_shop = get_nested(data, 'totals', 'shop') or {}
    if isinstance(totals_shop.get('appearances'), dict) and totals_shop['appearances']:
        return totals_shop['appearances']
    return {}


def collect_spells(data):
    for key in ['spells']:
        value = data.get(key)
        if isinstance(value, dict) and value:
            return value
    totals = data.get('totals', {})
    if isinstance(totals.get('spells'), dict):
        return totals['spells']
    return {}


def build_round_stats(data, refresh_events, buy_events):
    round_keys = set()
    for entry in refresh_events + buy_events:
        round_keys.add(safe_int(entry.get('round'), 0))
    for key in data.get('rounds', {}).keys():
        round_keys.add(safe_int(key, 0))
    if not round_keys:
        round_keys = {1}

    rows = []
    for round_no in sorted(round_keys):
        if round_no <= 0:
            continue
        r_refreshes = [e for e in refresh_events if safe_int(e.get('round'), 0) == round_no]
        r_buys = [e for e in buy_events if safe_int(e.get('round'), 0) == round_no]
        rows.append({
            'round': round_no,
            'refresh_count': len(r_refreshes),
            'buy_count': len(r_buys),
            'total_cost': sum(safe_int(e.get('cost'), 0) for e in r_refreshes + r_buys),
        })
    return pd.DataFrame(rows)


def save_plot(fig, name, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    fig.tight_layout()
    fig.savefig(os.path.join(output_dir, name), dpi=150)
    plt.close(fig)


def plot_refresh_distribution(refresh_events, output_dir):
    if not refresh_events:
        print('没有刷新事件数据')
        return None
    df = pd.DataFrame(refresh_events)
    if df.empty:
        return None
    df['datetime'] = pd.to_datetime(df['at'])
    df['time_seconds'] = (df['datetime'] - df['datetime'].min()).dt.total_seconds()

    fig, ax = plt.subplots(figsize=(14, 6))
    colors = ['#d62728' if item else '#1f77b4' for item in df['is_auto']]
    ax.scatter(df['time_seconds'], df['round'], c=colors, s=60, alpha=0.75, edgecolors='black', linewidth=0.5)
    ax.set_xlabel('游戏进行时间 (秒)')
    ax.set_ylabel('回合数')
    ax.set_title('刷新分布散点图')
    ax.grid(True, alpha=0.3)
    ax.set_yticks(sorted(df['round'].unique()))
    from matplotlib.patches import Patch
    ax.legend(handles=[Patch(facecolor='#d62728', label='自动刷新'), Patch(facecolor='#1f77b4', label='手动刷新')], loc='upper left')
    save_plot(fig, 'refresh_distribution.png', output_dir)
    return df


def plot_cost_distribution(refresh_events, buy_events, output_dir):
    rows = []
    for item in refresh_events:
        rows.append({'at': item['at'], 'round': safe_int(item.get('round'), 0), 'cost': safe_int(item.get('cost'), 0), 'type': '刷新'})
    for item in buy_events:
        rows.append({'at': item['at'], 'round': safe_int(item.get('round'), 0), 'cost': safe_int(item.get('cost'), 0), 'type': '购买'})
    if not rows:
        print('没有消耗事件数据')
        return None

    df = pd.DataFrame(rows)
    df['datetime'] = pd.to_datetime(df['at'])
    df['time_seconds'] = (df['datetime'] - df['datetime'].min()).dt.total_seconds()
    fig, ax = plt.subplots(figsize=(14, 6))
    refresh_df = df[df['type'] == '刷新']
    buy_df = df[df['type'] == '购买']
    if not refresh_df.empty:
        ax.scatter(refresh_df['time_seconds'], refresh_df['cost'], c='royalblue', s=60, alpha=0.75, label='刷新消耗', edgecolors='black', linewidth=0.5)
    if not buy_df.empty:
        ax.scatter(buy_df['time_seconds'], buy_df['cost'], c='forestgreen', s=60, alpha=0.75, label='购买消耗', edgecolors='black', linewidth=0.5)
    ax.set_xlabel('游戏进行时间 (秒)')
    ax.set_ylabel('虎符消耗')
    ax.set_title('虎符消耗分布散点图')
    ax.grid(True, alpha=0.3)
    ax.legend(loc='upper left')
    save_plot(fig, 'cost_distribution.png', output_dir)
    return df


def plot_round_stats(round_df, output_dir):
    if round_df is None or round_df.empty:
        print('没有回合统计数据')
        return None
    fig, axes = plt.subplots(3, 1, figsize=(14, 12))
    axes[0].bar(round_df['round'], round_df['refresh_count'], color='steelblue', alpha=0.8, edgecolor='black')
    axes[0].set_title('各回合刷新次数')
    axes[0].set_xlabel('回合数')
    axes[0].set_ylabel('刷新次数')
    axes[0].grid(True, alpha=0.3, axis='y')

    axes[1].bar(round_df['round'], round_df['buy_count'], color='coral', alpha=0.8, edgecolor='black')
    axes[1].set_title('各回合购买次数')
    axes[1].set_xlabel('回合数')
    axes[1].set_ylabel('购买次数')
    axes[1].grid(True, alpha=0.3, axis='y')

    axes[2].bar(round_df['round'], round_df['total_cost'], color='forestgreen', alpha=0.8, edgecolor='black')
    axes[2].set_title('各回合虎符消耗')
    axes[2].set_xlabel('回合数')
    axes[2].set_ylabel('虎符消耗')
    axes[2].grid(True, alpha=0.3, axis='y')
    save_plot(fig, 'round_stats.png', output_dir)
    return round_df


def plot_chess_appearances(data, output_dir, top_n=30):
    appearances = collect_appearances(data)
    if not appearances:
        print('没有卡牌出现数据')
        return None

    items = []
    for key, value in appearances.items():
        if key == 'unknown' or str(key).startswith('spell:'):
            continue
        sample = value.get('sample', {}) if isinstance(value, dict) else {}
        name = sample.get('name', key)
        count = safe_int(value.get('count'), 0)
        if count > 0:
            items.append((name, count))
    if not items:
        print('没有可展示的卡牌出现数据')
        return None

    items = sorted(items, key=lambda x: x[1], reverse=True)[:top_n]
    names = [item[0] for item in items]
    counts = [item[1] for item in items]
    fig, ax = plt.subplots(figsize=(14, max(6, len(items) * 0.35)))
    bars = ax.barh(names, counts, color=plt.cm.viridis([0.25 + i * 0.65 / max(1, len(items) - 1) for i in range(len(items))]), edgecolor='black', linewidth=0.5)
    ax.set_xlabel('出现次数')
    ax.set_ylabel('卡牌名称')
    ax.set_title(f'卡牌出现次数排行 (Top {len(items)})')
    ax.grid(True, alpha=0.3, axis='x')
    for bar, count in zip(bars, counts):
        ax.text(bar.get_width() + 0.2, bar.get_y() + bar.get_height() / 2, str(count), va='center', ha='left', fontsize=9)
    save_plot(fig, 'chess_appearances.png', output_dir)
    return items


def plot_spell_appearances(data, output_dir):
    spells = collect_spells(data)
    if not spells:
        print('没有锦囊数据')
        return None

    items = []
    for key, value in spells.items():
        sample = value.get('sample', {}) if isinstance(value, dict) else {}
        name = sample.get('name', key)
        count = safe_int(value.get('count'), 0)
        if count > 0:
            items.append((name, count))
    if not items:
        print('没有可展示的锦囊数据')
        return None

    items = sorted(items, key=lambda x: x[1], reverse=True)
    names = [item[0] for item in items]
    counts = [item[1] for item in items]
    fig, ax = plt.subplots(figsize=(12, max(6, len(items) * 0.4)))
    bars = ax.barh(names, counts, color=plt.cm.plasma([0.2 + i * 0.7 / max(1, len(items) - 1) for i in range(len(items))]), edgecolor='black', linewidth=0.5)
    ax.set_xlabel('出现次数')
    ax.set_ylabel('锦囊名称')
    ax.set_title('锦囊出现次数排行')
    ax.grid(True, alpha=0.3, axis='x')
    for bar, count in zip(bars, counts):
        ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height() / 2, str(count), va='center', ha='left', fontsize=9)
    save_plot(fig, 'spell_appearances.png', output_dir)
    return items


def plot_spell_timeline(spell_events, output_dir):
    if not spell_events:
        print('没有锦囊使用事件')
        return None
    df = pd.DataFrame(spell_events)
    if df.empty:
        return None
    df['round'] = pd.to_numeric(df['round'], errors='coerce').fillna(0)
    grouped = df.groupby('round').size().reset_index(name='count')
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.bar(grouped['round'], grouped['count'], color='#ff7f0e', edgecolor='black', alpha=0.8)
    ax.set_title('各回合锦囊使用次数')
    ax.set_xlabel('回合数')
    ax.set_ylabel('使用次数')
    ax.grid(True, alpha=0.3, axis='y')
    save_plot(fig, 'spell_timeline.png', output_dir)
    return grouped


def plot_round_card_diversity(data, output_dir):
    rounds = data.get('rounds', {})
    if not rounds:
        print('没有回合数据')
        return None

    rows = []
    for round_key, round_data in rounds.items():
        shop = round_data.get('shop', {}) if isinstance(round_data, dict) else {}
        appearances = shop.get('appearances', {}) or {}
        cards = {key for key in appearances.keys() if key != 'unknown' and not str(key).startswith('spell:')}
        rows.append({'round': safe_int(round_key), 'diversity': len(cards)})
    if not rows:
        return None

    df = pd.DataFrame(rows).sort_values('round')
    fig, ax = plt.subplots(figsize=(14, 6))
    ax.bar(df['round'], df['diversity'], color='purple', alpha=0.7, edgecolor='black')
    ax.set_title('各回合卡牌出现种类数')
    ax.set_xlabel('回合数')
    ax.set_ylabel('卡牌种类数')
    ax.grid(True, alpha=0.3, axis='y')
    save_plot(fig, 'round_card_diversity.png', output_dir)
    return df


def plot_bought_chess_ranking(buy_events, output_dir):
    if not buy_events:
        print('没有购买事件数据')
        return None
    counter = Counter(item.get('goods_name', 'unknown') for item in buy_events if item.get('goods_name') and item.get('goods_name') != 'unknown')
    if not counter:
        print('没有可展示的购买卡牌数据')
        return None
    items = counter.most_common()
    names = [item[0] for item in items]
    counts = [item[1] for item in items]
    fig, ax = plt.subplots(figsize=(12, max(6, len(items) * 0.4)))
    bars = ax.barh(names, counts, color=plt.cm.coolwarm([0.2 + i * 0.7 / max(1, len(items) - 1) for i in range(len(items))]), edgecolor='black', linewidth=0.5)
    ax.set_title('购买卡牌排行')
    ax.set_xlabel('购买次数')
    ax.set_ylabel('卡牌名称')
    ax.grid(True, alpha=0.3, axis='x')
    for bar, count in zip(bars, counts):
        ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height() / 2, str(count), va='center', ha='left', fontsize=9)
    save_plot(fig, 'bought_chess_ranking.png', output_dir)
    return items


def plot_summary_stats(data, refresh_events, buy_events, output_dir):
    totals = data.get('totals', {})
    shop_total = totals.get('shop', {}) if isinstance(totals.get('shop'), dict) else {}

    total_rounds = len(data.get('rounds', {}))
    total_refresh = len(refresh_events)
    total_buy = len(buy_events)
    total_hufu_refresh = sum(safe_int(item.get('cost'), 0) for item in refresh_events)
    total_hufu_buy = sum(safe_int(item.get('cost'), 0) for item in buy_events)
    total_hufu = total_hufu_refresh + total_hufu_buy
    auto_refresh = sum(1 for item in refresh_events if item.get('is_auto'))
    shop_snapshots = safe_int(shop_total.get('snapshots'), 0)

    appearances = collect_appearances(data)
    total_chess = sum(safe_int(value.get('count'), 0) for key, value in appearances.items() if key != 'unknown' and not str(key).startswith('spell:'))
    spells = collect_spells(data)
    total_spells = sum(safe_int(value.get('count'), 0) for value in spells.values())

    stats = {
        '总回合数': total_rounds,
        '刷新次数': total_refresh,
        '购买次数': total_buy,
        '自动刷新': auto_refresh,
        '手动刷新': total_refresh - auto_refresh,
        '刷新消耗虎符': total_hufu_refresh,
        '购买消耗虎符': total_hufu_buy,
        '总虎符消耗': total_hufu,
        '商店快照数': shop_snapshots,
        '卡牌出现总次数': total_chess,
        '锦囊出现总次数': total_spells,
    }

    fig, ax = plt.subplots(figsize=(12, 7))
    table_data = [[key, str(value)] for key, value in stats.items()]
    table = ax.table(cellText=table_data, colLabels=['统计项', '数值'], cellLoc='center', loc='center', colWidths=[0.4, 0.2])
    table.auto_set_font_size(False)
    table.set_fontsize(11)
    table.scale(1, 1.8)
    for i in range(2):
        table[(0, i)].set_facecolor('#4CAF50')
        table[(0, i)].set_text_props(weight='bold', color='white')
    for i in range(1, len(table_data) + 1):
        if i % 2 == 0:
            for j in range(2):
                table[(i, j)].set_facecolor('#f5f5f5')
    ax.set_title('整局游戏统计摘要')
    ax.axis('off')
    save_plot(fig, 'summary_stats.png', output_dir)
    return stats


def main():
    args = parse_args()
    input_path = args.input
    output_dir = args.output_dir

    if not os.path.exists(input_path):
        print(f'输入文件不存在: {input_path}')
        return

    data = load_data(input_path)
    refresh_events = extract_refresh_events(data)
    buy_events = extract_buy_events(data)
    spell_events = extract_spell_events(data)

    os.makedirs(output_dir, exist_ok=True)
    print('开始生成数据可视化图表...')
    print('=' * 50)
    print(f'输入文件: {input_path}')
    print(f'输出目录: {output_dir}')
    print(f'共找到 {len(refresh_events)} 次刷新事件, {len(buy_events)} 次购买事件, {len(spell_events)} 次锦囊使用事件')

    print('\n1. 生成刷新分布散点图...')
    plot_refresh_distribution(refresh_events, output_dir)
    print('\n2. 生成虎符消耗散点图...')
    plot_cost_distribution(refresh_events, buy_events, output_dir)
    print('\n3. 生成回合统计柱状图...')
    plot_round_stats(build_round_stats(data, refresh_events, buy_events), output_dir)
    print('\n4. 生成卡牌出现排行...')
    plot_chess_appearances(data, output_dir, top_n=30)
    print('\n5. 生成锦囊出现排行...')
    plot_spell_appearances(data, output_dir)
    print('\n6. 生成锦囊使用时间线...')
    plot_spell_timeline(spell_events, output_dir)
    print('\n7. 生成各回合卡牌种类数图...')
    plot_round_card_diversity(data, output_dir)
    print('\n8. 生成购买卡牌排行...')
    plot_bought_chess_ranking(buy_events, output_dir)
    print('\n9. 生成统计摘要...')
    plot_summary_stats(data, refresh_events, buy_events, output_dir)

    print('\n' + '=' * 50)
    print('所有图表生成完成！')
    print(f'图片保存在: {output_dir}')


if __name__ == '__main__':
<<<<<<< HEAD
    main()
=======
    main()
>>>>>>> be50bd8d13fe5dae12536663df8f7c6832d69575
