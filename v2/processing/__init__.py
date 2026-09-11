"""Processing and Analytics Module for Gridiron Hub 2.0.

Provides EPA formulas, Win Probability swing calculations, and YouTube trivia generators.
"""

from .epa_calculator import calculate_team_epa, calculate_play_epa
from .wp_calculator import calculate_wp_swing, rank_top_plays
from .trivia_generator import generate_game_trivia

__all__ = [
    "calculate_team_epa",
    "calculate_play_epa",
    "calculate_wp_swing",
    "rank_top_plays",
    "generate_game_trivia",
]

