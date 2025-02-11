# app.py (Flask app file)
from flask import Flask, jsonify
from jobScraper import scrape_jobs  # assuming your script is saved as job_scraper.py

app = Flask(__name__)


@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    jobs, max_jobs = scrape_jobs()
    return jsonify(jobs)

if __name__ == "__main__":
    app.run(debug=False)
