"""
Seating utilities: Deprecated. Seat allocation has been completely removed from EventSphere.
These stubs exist for safe backward compatibility if imported by legacy scripts.
"""
from typing import List, Optional, Set


def generate_event_seats(total_rows: int = 0, seats_per_row: int = 0) -> List[str]:
    return []


def find_next_available_seat(
    all_seats: List[str] = None,
    occupied_seats: Set[str] = None,
) -> Optional[str]:
    return None

