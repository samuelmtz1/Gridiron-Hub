"""Assets Source for Gridiron Hub.

Provides official SVG logos and primary/secondary hex color palettes for NFL and NCAA teams.
Data sourced directly from public raw GitHub repositories (nflplotR / cfbplotR).
License: MIT / CC-BY. Cost: $0 perpetual.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

# Base raw URLs for official SVG logos
NFL_LOGO_BASE = "https://raw.githubusercontent.com/nflverse/nflplotR/main/data-raw/logos"
CFB_LOGO_BASE = "https://raw.githubusercontent.com/Kazink36/cfbplotR/main/data-raw/logos"

# Complete NFL Directory (32 Teams with Conferences, Divisions, and Official Brand Colors)
NFL_TEAMS: List[Dict[str, Any]] = [
    # AFC East
    {
        "id": "nfl_BUF", "league": "nfl", "code": "BUF", "name": "Buffalo Bills",
        "short_name": "Bills", "city": "Buffalo", "conference": "AFC", "division": "East",
        "primary_color": "#00338D", "secondary_color": "#C60C30",
        "logo_url": f"{NFL_LOGO_BASE}/buf.svg"
    },
    {
        "id": "nfl_MIA", "league": "nfl", "code": "MIA", "name": "Miami Dolphins",
        "short_name": "Dolphins", "city": "Miami", "conference": "AFC", "division": "East",
        "primary_color": "#008E97", "secondary_color": "#FC4C02",
        "logo_url": f"{NFL_LOGO_BASE}/mia.svg"
    },
    {
        "id": "nfl_NE", "league": "nfl", "code": "NE", "name": "New England Patriots",
        "short_name": "Patriots", "city": "Foxborough", "conference": "AFC", "division": "East",
        "primary_color": "#002244", "secondary_color": "#C60C30",
        "logo_url": f"{NFL_LOGO_BASE}/ne.svg"
    },
    {
        "id": "nfl_NYJ", "league": "nfl", "code": "NYJ", "name": "New York Jets",
        "short_name": "Jets", "city": "East Rutherford", "conference": "AFC", "division": "East",
        "primary_color": "#125740", "secondary_color": "#FFFFFF",
        "logo_url": f"{NFL_LOGO_BASE}/nyj.svg"
    },

    # AFC North
    {
        "id": "nfl_BAL", "league": "nfl", "code": "BAL", "name": "Baltimore Ravens",
        "short_name": "Ravens", "city": "Baltimore", "conference": "AFC", "division": "North",
        "primary_color": "#241773", "secondary_color": "#9E7C0C",
        "logo_url": f"{NFL_LOGO_BASE}/bal.svg"
    },
    {
        "id": "nfl_CIN", "league": "nfl", "code": "CIN", "name": "Cincinnati Bengals",
        "short_name": "Bengals", "city": "Cincinnati", "conference": "AFC", "division": "North",
        "primary_color": "#FB4F14", "secondary_color": "#000000",
        "logo_url": f"{NFL_LOGO_BASE}/cin.svg"
    },
    {
        "id": "nfl_CLE", "league": "nfl", "code": "CLE", "name": "Cleveland Browns",
        "short_name": "Browns", "city": "Cleveland", "conference": "AFC", "division": "North",
        "primary_color": "#311D00", "secondary_color": "#FF3C00",
        "logo_url": f"{NFL_LOGO_BASE}/cle.svg"
    },
    {
        "id": "nfl_PIT", "league": "nfl", "code": "PIT", "name": "Pittsburgh Steelers",
        "short_name": "Steelers", "city": "Pittsburgh", "conference": "AFC", "division": "North",
        "primary_color": "#FFB612", "secondary_color": "#101820",
        "logo_url": f"{NFL_LOGO_BASE}/pit.svg"
    },

    # AFC South
    {
        "id": "nfl_HOU", "league": "nfl", "code": "HOU", "name": "Houston Texans",
        "short_name": "Texans", "city": "Houston", "conference": "AFC", "division": "South",
        "primary_color": "#03202F", "secondary_color": "#A71930",
        "logo_url": f"{NFL_LOGO_BASE}/hou.svg"
    },
    {
        "id": "nfl_IND", "league": "nfl", "code": "IND", "name": "Indianapolis Colts",
        "short_name": "Colts", "city": "Indianapolis", "conference": "AFC", "division": "South",
        "primary_color": "#002C5F", "secondary_color": "#A2AAAD",
        "logo_url": f"{NFL_LOGO_BASE}/ind.svg"
    },
    {
        "id": "nfl_JAX", "league": "nfl", "code": "JAX", "name": "Jacksonville Jaguars",
        "short_name": "Jaguars", "city": "Jacksonville", "conference": "AFC", "division": "South",
        "primary_color": "#006778", "secondary_color": "#D7A22A",
        "logo_url": f"{NFL_LOGO_BASE}/jax.svg"
    },
    {
        "id": "nfl_TEN", "league": "nfl", "code": "TEN", "name": "Tennessee Titans",
        "short_name": "Titants", "city": "Nashville", "conference": "AFC", "division": "South",
        "primary_color": "#0C2340", "secondary_color": "#4B92DB",
        "logo_url": f"{NFL_LOGO_BASE}/ten.svg"
    },

    # AFC West
    {
        "id": "nfl_DEN", "league": "nfl", "code": "DEN", "name": "Denver Broncos",
        "short_name": "Broncos", "city": "Denver", "conference": "AFC", "division": "West",
        "primary_color": "#FB4F14", "secondary_color": "#002244",
        "logo_url": f"{NFL_LOGO_BASE}/den.svg"
    },
    {
        "id": "nfl_KC", "league": "nfl", "code": "KC", "name": "Kansas City Chiefs",
        "short_name": "Chiefs", "city": "Kansas City", "conference": "AFC", "division": "West",
        "primary_color": "#E31837", "secondary_color": "#FFB81C",
        "logo_url": f"{NFL_LOGO_BASE}/kc.svg"
    },
    {
        "id": "nfl_LV", "league": "nfl", "code": "LV", "name": "Las Vegas Raiders",
        "short_name": "Raiders", "city": "Las Vegas", "conference": "AFC", "division": "West",
        "primary_color": "#000000", "secondary_color": "#A5ACAF",
        "logo_url": f"{NFL_LOGO_BASE}/lv.svg"
    },
    {
        "id": "nfl_LAC", "league": "nfl", "code": "LAC", "name": "Los Angeles Chargers",
        "short_name": "Chargers", "city": "Los Angeles", "conference": "AFC", "division": "West",
        "primary_color": "#0080C6", "secondary_color": "#FFC20E",
        "logo_url": f"{NFL_LOGO_BASE}/lac.svg"
    },

    # NFC East
    {
        "id": "nfl_DAL", "league": "nfl", "code": "DAL", "name": "Dallas Cowboys",
        "short_name": "Cowboys", "city": "Arlington", "conference": "NFC", "division": "East",
        "primary_color": "#003594", "secondary_color": "#041E42",
        "logo_url": f"{NFL_LOGO_BASE}/dal.svg"
    },
    {
        "id": "nfl_NYG", "league": "nfl", "code": "NYG", "name": "New York Giants",
        "short_name": "Giants", "city": "East Rutherford", "conference": "NFC", "division": "East",
        "primary_color": "#0B2265", "secondary_color": "#A71930",
        "logo_url": f"{NFL_LOGO_BASE}/nyg.svg"
    },
    {
        "id": "nfl_PHI", "league": "nfl", "code": "PHI", "name": "Philadelphia Eagles",
        "short_name": "Eagles", "city": "Philadelphia", "conference": "NFC", "division": "East",
        "primary_color": "#004C54", "secondary_color": "#A5ACAF",
        "logo_url": f"{NFL_LOGO_BASE}/phi.svg"
    },
    {
        "id": "nfl_WAS", "league": "nfl", "code": "WAS", "name": "Washington Commanders",
        "short_name": "Commanders", "city": "Landover", "conference": "NFC", "division": "East",
        "primary_color": "#5A1414", "secondary_color": "#FFB612",
        "logo_url": f"{NFL_LOGO_BASE}/was.svg"
    },

    # NFC North
    {
        "id": "nfl_CHI", "league": "nfl", "code": "CHI", "name": "Chicago Bears",
        "short_name": "Bears", "city": "Chicago", "conference": "NFC", "division": "North",
        "primary_color": "#0B162A", "secondary_color": "#C83803",
        "logo_url": f"{NFL_LOGO_BASE}/chi.svg"
    },
    {
        "id": "nfl_DET", "league": "nfl", "code": "DET", "name": "Detroit Lions",
        "short_name": "Lions", "city": "Detroit", "conference": "NFC", "division": "North",
        "primary_color": "#0076B6", "secondary_color": "#B0B7BC",
        "logo_url": f"{NFL_LOGO_BASE}/det.svg"
    },
    {
        "id": "nfl_GB", "league": "nfl", "code": "GB", "name": "Green Bay Packers",
        "short_name": "Packers", "city": "Green Bay", "conference": "NFC", "division": "North",
        "primary_color": "#203731", "secondary_color": "#FFB612",
        "logo_url": f"{NFL_LOGO_BASE}/gb.svg"
    },
    {
        "id": "nfl_MIN", "league": "nfl", "code": "MIN", "name": "Minnesota Vikings",
        "short_name": "Vikings", "city": "Minneapolis", "conference": "NFC", "division": "North",
        "primary_color": "#4F2683", "secondary_color": "#FFC62F",
        "logo_url": f"{NFL_LOGO_BASE}/min.svg"
    },

    # NFC South
    {
        "id": "nfl_ATL", "league": "nfl", "code": "ATL", "name": "Atlanta Falcons",
        "short_name": "Falcons", "city": "Atlanta", "conference": "NFC", "division": "South",
        "primary_color": "#A71930", "secondary_color": "#000000",
        "logo_url": f"{NFL_LOGO_BASE}/atl.svg"
    },
    {
        "id": "nfl_CAR", "league": "nfl", "code": "CAR", "name": "Carolina Panthers",
        "short_name": "Panthers", "city": "Charlotte", "conference": "NFC", "division": "South",
        "primary_color": "#0085CA", "secondary_color": "#101820",
        "logo_url": f"{NFL_LOGO_BASE}/car.svg"
    },
    {
        "id": "nfl_NO", "league": "nfl", "code": "NO", "name": "New Orleans Saints",
        "short_name": "Saints", "city": "New Orleans", "conference": "NFC", "division": "South",
        "primary_color": "#D3BC8D", "secondary_color": "#101820",
        "logo_url": f"{NFL_LOGO_BASE}/no.svg"
    },
    {
        "id": "nfl_TB", "league": "nfl", "code": "TB", "name": "Tampa Bay Buccaneers",
        "short_name": "Buccaneers", "city": "Tampa", "conference": "NFC", "division": "South",
        "primary_color": "#D50A0A", "secondary_color": "#0A0A08",
        "logo_url": f"{NFL_LOGO_BASE}/tb.svg"
    },

    # NFC West
    {
        "id": "nfl_ARI", "league": "nfl", "code": "ARI", "name": "Arizona Cardinals",
        "short_name": "Cardinals", "city": "Glendale", "conference": "NFC", "division": "West",
        "primary_color": "#97233F", "secondary_color": "#000000",
        "logo_url": f"{NFL_LOGO_BASE}/ari.svg"
    },
    {
        "id": "nfl_LAR", "league": "nfl", "code": "LAR", "name": "Los Angeles Rams",
        "short_name": "Rams", "city": "Los Angeles", "conference": "NFC", "division": "West",
        "primary_color": "#003594", "secondary_color": "#FFA300",
        "logo_url": f"{NFL_LOGO_BASE}/lar.svg"
    },
    {
        "id": "nfl_SF", "league": "nfl", "code": "SF", "name": "San Francisco 49ers",
        "short_name": "49ers", "city": "Santa Clara", "conference": "NFC", "division": "West",
        "primary_color": "#AA0000", "secondary_color": "#B3995D",
        "logo_url": f"{NFL_LOGO_BASE}/sf.svg"
    },
    {
        "id": "nfl_SEA", "league": "nfl", "code": "SEA", "name": "Seattle Seahawks",
        "short_name": "Seahawks", "city": "Seattle", "conference": "NFC", "division": "West",
        "primary_color": "#002244", "secondary_color": "#69BE28",
        "logo_url": f"{NFL_LOGO_BASE}/sea.svg"
    },
]

# Top NCAA College Football Programs (SEC, Big Ten, Big 12, ACC, Independent)
NCAA_TEAMS: List[Dict[str, Any]] = [
    {
        "id": "ncaa_ALA", "league": "ncaa", "code": "ALA", "name": "Alabama Crimson Tide",
        "short_name": "Alabama", "city": "Tuscaloosa", "conference": "SEC", "division": None,
        "primary_color": "#9E1B32", "secondary_color": "#828A8F",
        "logo_url": f"{CFB_LOGO_BASE}/Alabama.svg"
    },
    {
        "id": "ncaa_UGA", "league": "ncaa", "code": "UGA", "name": "Georgia Bulldogs",
        "short_name": "Georgia", "city": "Athens", "conference": "SEC", "division": None,
        "primary_color": "#BA0C2F", "secondary_color": "#000000",
        "logo_url": f"{CFB_LOGO_BASE}/Georgia.svg"
    },
    {
        "id": "ncaa_TEX", "league": "ncaa", "code": "TEX", "name": "Texas Longhorns",
        "short_name": "Texas", "city": "Austin", "conference": "SEC", "division": None,
        "primary_color": "#BF5700", "secondary_color": "#FFFFFF",
        "logo_url": f"{CFB_LOGO_BASE}/Texas.svg"
    },
    {
        "id": "ncaa_OSU", "league": "ncaa", "code": "OSU", "name": "Ohio State Buckeyes",
        "short_name": "Ohio State", "city": "Columbus", "conference": "Big Ten", "division": None,
        "primary_color": "#BB0000", "secondary_color": "#666666",
        "logo_url": f"{CFB_LOGO_BASE}/Ohio_State.svg"
    },
    {
        "id": "ncaa_MICH", "league": "ncaa", "code": "MICH", "name": "Michigan Wolverines",
        "short_name": "Michigan", "city": "Ann Arbor", "conference": "Big Ten", "division": None,
        "primary_color": "#00274C", "secondary_color": "#FFCB05",
        "logo_url": f"{CFB_LOGO_BASE}/Michigan.svg"
    },
    {
        "id": "ncaa_ORE", "league": "ncaa", "code": "ORE", "name": "Oregon Ducks",
        "short_name": "Oregon", "city": "Eugene", "conference": "Big Ten", "division": None,
        "primary_color": "#154734", "secondary_color": "#FEE123",
        "logo_url": f"{CFB_LOGO_BASE}/Oregon.svg"
    },
    {
        "id": "ncaa_ND", "league": "ncaa", "code": "ND", "name": "Notre Dame Fighting Irish",
        "short_name": "Notre Dame", "city": "South Bend", "conference": "FBS Independent", "division": None,
        "primary_color": "#0C2340", "secondary_color": "#C99700",
        "logo_url": f"{CFB_LOGO_BASE}/Notre_Dame.svg"
    },
    {
        "id": "ncaa_CLEM", "league": "ncaa", "code": "CLEM", "name": "Clemson Tigers",
        "short_name": "Clemson", "city": "Clemson", "conference": "ACC", "division": None,
        "primary_color": "#F56600", "secondary_color": "#522D80",
        "logo_url": f"{CFB_LOGO_BASE}/Clemson.svg"
    },
]


def load_all_teams() -> List[Dict[str, Any]]:
    """Returns the full collection of NFL and NCAA teams ready for database insertion."""
    return NFL_TEAMS + NCAA_TEAMS


def get_team_by_code(code: str, league: str = "nfl") -> Optional[Dict[str, Any]]:
    """Fetches team assets by team abbreviation code."""
    search_list = NFL_TEAMS if league == "nfl" else NCAA_TEAMS
    for team in search_list:
        if team["code"].upper() == code.upper():
            return team
    return None
