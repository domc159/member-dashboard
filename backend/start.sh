#!/bin/bash
# Start the API server in the background
python api-server.py &

# Start the db_importer in the background
python db_importer.py &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $? 