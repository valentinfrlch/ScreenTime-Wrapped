import sqlite3
from os.path import expanduser


def query_database():
    # the path is "Library/Application Support/Knowledge/knowledgeC.db" but we need to expand
    db_dir = expanduser("~") + "/Library/Application Support/Knowledge/knowledgeC.db"
    db_dir = "tmp/knowledgeC.db"

    conn = sqlite3.connect(db_dir)
    cursor = conn.cursor()
    query = """
    SELECT
            ZOBJECT.ZVALUESTRING AS "app", 
            (ZOBJECT.ZENDDATE - ZOBJECT.ZSTARTDATE) AS "usage",
            (ZOBJECT.ZSTARTDATE + 978307200) as "start_time", 
            (ZOBJECT.ZENDDATE + 978307200) as "end_time",
            (ZOBJECT.ZCREATIONDATE + 978307200) as "created_at", 
            ZOBJECT.ZSECONDSFROMGMT AS "tz",
            ZSOURCE.ZDEVICEID AS "device_id",
            ZMODEL AS "device_model"
        FROM
            ZOBJECT 
            LEFT JOIN
            ZSTRUCTUREDMETADATA 
            ON ZOBJECT.ZSTRUCTUREDMETADATA = ZSTRUCTUREDMETADATA.Z_PK 
            LEFT JOIN
            ZSOURCE 
            ON ZOBJECT.ZSOURCE = ZSOURCE.Z_PK 
            LEFT JOIN
            ZSYNCPEER
            ON ZSOURCE.ZDEVICEID = ZSYNCPEER.ZDEVICEID
        WHERE
            ZSTREAMNAME = "/app/usage"
        ORDER BY
            ZSTARTDATE DESC
    """
    cursor.execute(query)
    
    results = cursor.fetchall()
    conn.close()
    return results

def transform_data(rows):
    apps = {}
    # we need to group by app so that we can sum the usage time
    for row in rows:
        app = row[0]
        usage = row[1]
        start_time = row[2]
        end_time = row[3]
        created_at = row[4]
        tz = row[5]
        device_id = row[6]
        device_model = row[7]

        if app in apps:
            apps[app]["usage"] += usage
        else:
            apps[app] = {
                "usage": usage, # in seconds
                "start_time": start_time,
                "end_time": end_time,
                "created_at": created_at,
                "tz": tz,
                "device_id": device_id,
                "device_model": device_model
            }
        
        
    return apps
        

    
if __name__ == "__main__":
    rows = query_database()
    dict = transform_data(rows)
    # sort the dict by usage
    sorted_dict = sorted(dict.items(), key=lambda x: x[1]["usage"], reverse=True)
    # print top 5 app bunle ids
    for i in range(5):
        print(sorted_dict[i][0])
