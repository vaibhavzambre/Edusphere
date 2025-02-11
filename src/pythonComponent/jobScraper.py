from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import pymongo
import pandas as pd
import time

try:
    client = pymongo.MongoClient("mongodb://localhost:27017/")
    db = client['main_db']
    collection = db['job_postings']
    print("MONGO Runningggggggggggggggggggggg")
except Exception as e:
    print(f"MongoDB connection error: {e}")
    exit()

# Initialize WebDriver
service = Service('C:/Users/ASUS/Downloads/Edusphere/src/pythonComponent/chromedriver-win64/chromedriver.exe')
driver = webdriver.Chrome(service=service)

def scrape_jobs():
    # Open Naukri website
    driver.get('https://www.naukri.com/')

    # Locate the search input field and enter the search term (JOB NAME / COMPANY NAME / SKILLS / COMBINATION OF ANY OF THEM)
    try:
        input_search = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '//*[@id=\"root\"]/div[7]/div/div/div[1]/div/div/div[1]/div[1]/div/input'))
        )
        input_search.send_keys('Software Engineer')

    except Exception as e:
        print(f"Error locating search input: {e}")
        return [], 0
    
    # Locate the search input field and enter the Location
    try:
        location_search = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '//*[@id=\"root\"]/div[7]/div/div/div[5]/div/div/div/div[1]/div/input'))
        )
        location_search.send_keys('Mumbai')

    except Exception as e:
        print(f"Error locating search input location: {e}")
        return [], 0

    # Variable for years of experience
    years_of_experience = 10  # This is the value you want to match

    # Locate and select the experience dropdown
    try:
        experience_dropdown = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, '//*[@id=\"expereinceDD\"]'))
        )
        experience_dropdown.click()  # Click to open the dropdown

        # Wait for the options to become visible
        experience_options = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.XPATH, '//*[@id=\"sa-dd-scrollexpereinceDD\"]/div[1]/ul/li'))
        )

        for index in range(len(experience_options)):
            option_xpath = f'//*[@id=\"sa-dd-scrollexpereinceDD\"]/div[1]/ul/li[{index + 1}]'  # XPath for each option
            option = driver.find_element(By.XPATH, option_xpath)
            value_attribute = option.get_attribute('index')

            if len(experience_options)-1 < years_of_experience:
                option_xpath = f'//*[@id=\"sa-dd-scrollexpereinceDD\"]/div[1]/ul/li[{len(experience_options)}]'
                option = driver.find_element(By.XPATH, option_xpath)   
                option.click()
                print(f"Selected experience: {value_attribute}")
                break

            if years_of_experience < 0:
                option_xpath = f'//*[@id=\"sa-dd-scrollexpereinceDD\"]/div[1]/ul/li[1]'
                option = driver.find_element(By.XPATH, option_xpath)   
                option.click()
                print(f"Selected experience: {value_attribute}")
                break

            if str(value_attribute) == str(years_of_experience):
                option.click()
                print(f"Selected experience: {value_attribute}")
                break

    except Exception as e:
        print(f"Error selecting experience: {e}")

    # Locate and click the search button
    try:
        button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, '//*[@id=\"root\"]/div[7]/div/div/div[6]'))
        )
        button.click()
    except Exception as e:
        print(f"Error clicking search button: {e}")
        return [], 0

    # Wait for the page to load after search
    time.sleep(10)

    # Initialize a list to store job postings
    job_list = []

    # Get the max number of jobs found on the site for the given keyword
    max_jobs_for_given_keyword = 0
    try:
        max_jobs_element = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '.styles_count-string__DlPaZ'))
        )
        title = max_jobs_element.get_attribute('title')
        max_jobs_for_given_keyword = int(title.split("of")[1].strip())
        print(f"Max jobs for given keyword: {max_jobs_for_given_keyword}")
    except Exception as e:
        print(f"Error retrieving max jobs: {e}")
        return job_list, 0

    limit_max_jobs = 100
    count = min(max_jobs_for_given_keyword, limit_max_jobs)

    while count > 0:
        soup = BeautifulSoup(driver.page_source, 'lxml')
        posting = soup.find_all('div', class_='srp-jobtuple-wrapper')

        if not posting:
            print("No job postings found.")
            break
        
        for post in posting:
            if count <= 0:
                break

            link = post.find('a', class_='title').get('href') if post.find('a', class_='title') else 'No link available'
            name = post.find('a', class_='title').text if post.find('a', class_='title') else 'No title available'
            Com_name = post.find('a', class_='comp-name').text if post.find('a', class_='comp-name') else 'No company name available'
            Experience = post.find('span', class_='expwdth').text if post.find('span', class_='expwdth') else 'No experience data available'
            Salary = post.find('span', class_='ni-job-tuple-icon-srp-rupee').text if post.find('span', class_='ni-job-tuple-icon-srp-rupee') else 'No salary data available'
            location = post.find('span', class_='locWdth').text if post.find('span', class_='locWdth') else 'No location data available'
            skill_ul = post.find('ul', class_='tags-gt')
            skills = [li.text for li in skill_ul.find_all('li')] if skill_ul else []
            date_posted_element = post.find('span', class_='job-post-day')
            DatePosted = date_posted_element.text if date_posted_element else 'Not specified'
            logo_img = post.find('img', class_='logoImage')
            CompanyLogo = logo_img['src'] if logo_img else 'No logo available'

            job_list.append({
                'Link': link,
                'Name': name,
                'Com_name': Com_name,
                'Experience': Experience,
                'Salary': Salary,
                'Location': location,
                'SkillRequirements': skills,
                'DatePosted': DatePosted,
                'CompanyLogo': CompanyLogo,
                'Bookmarked': False 
            })
            count -= 1

        try:
            next_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "#lastCompMark > a:nth-child(4)"))
            )
            next_button.click()
            time.sleep(10)
        except Exception as e:
            print("No more pages to load or error in finding the next button:", str(e))
            break

    return job_list, max_jobs_for_given_keyword

def update_job_data():
    collection.delete_many({'Bookmarked': {'$ne': True}})
    all_jobs = []

    retries = 3
    while retries > 0:
        jobs, max_jobs = scrape_jobs()
        if jobs:
            all_jobs.extend(jobs)
            break
        retries -= 1
    if retries == 0:
        print("Failed to scrape jobs after multiple retries.")

    if all_jobs:
        collection.insert_many(all_jobs)

    driver.quit()

# Run the scraper once
update_job_data()
