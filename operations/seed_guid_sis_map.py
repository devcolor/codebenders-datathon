"""
Seed guid_sis_map Table
========================
Creates the guid_sis_map table and populates it with ~20 demo mappings
for POC/demo purposes. Maps real Student_GUIDs to fake SIS IDs.
"""

from .db_utils import get_connection


def seed_guid_sis_map():
    """Create guid_sis_map table and seed with demo data."""
    connection = get_connection()
    cursor = connection.cursor()

    try:
        # Create table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS guid_sis_map (
                student_guid TEXT PRIMARY KEY,
                sis_id       TEXT NOT NULL
            );
        """)
        print("✓ guid_sis_map table created/verified")

        # Pick ~20 random GUIDs from student_level_with_predictions
        cursor.execute("""
            SELECT "Student_GUID"
            FROM student_level_with_predictions
            ORDER BY RANDOM()
            LIMIT 20
        """)
        guids = [row['Student_GUID'] for row in cursor.fetchall()]

        if not guids:
            print("✗ No students found in student_level_with_predictions")
            return False

        # Clear existing demo data and insert fresh mappings
        cursor.execute("DELETE FROM guid_sis_map")

        for i, guid in enumerate(guids, start=100001):
            sis_id = f"BSC-{i}"
            cursor.execute(
                "INSERT INTO guid_sis_map (student_guid, sis_id) VALUES (%s, %s)",
                (guid, sis_id)
            )

        connection.commit()
        print(f"✓ Seeded {len(guids)} GUID → SIS ID mappings (BSC-100001 .. BSC-{100000 + len(guids)})")

        # Verify
        cursor.execute("SELECT COUNT(*) AS count FROM guid_sis_map")
        count = cursor.fetchone()['count']
        print(f"✓ Verified: {count} records in guid_sis_map")

        return True

    except Exception as e:
        connection.rollback()
        print(f"✗ Failed to seed guid_sis_map: {e}")
        return False

    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    print("=" * 60)
    print("SEEDING guid_sis_map TABLE")
    print("=" * 60)
    seed_guid_sis_map()
