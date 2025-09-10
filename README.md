# smartwaste_ai
### **Prerequisites**

  * **Python 3.8+**
  * **Git** (Optional, for cloning)
  * **Firebase Account**

-----

### **Step 1: Get the Code**

You have two options to get the project files. Choose one.

**Option A: Clone with Git**

1.  Open a terminal and run this command:
    ```bash
    git clone https://github.com/sangrechy/smartwaste_ai.git
    ```

**Option B: Download ZIP File**

1.  Go to the [project's GitHub page](https://github.com/sangrechy/smartwaste_ai).
2.  Click the green **"Code"** button, then click **"Download ZIP"**.
3.  Find the downloaded file and **extract it**.

-----

### **Step 2: Backend Setup**

1.  Open a terminal and navigate into the `backend` folder.
    ```bash
    cd smartwaste_ai/backend
    ```
2.  Install the required Python packages.
    ```bash
    pip install -r requirements.txt
    ```
3.  Set up your Firebase credentials.
    1.  Go to your **Firebase Console**, create a new project, and go to **Project Settings**.
    2.  Click the **Service Accounts** tab.
    3.  Click **"Generate new private key"** to download a `.json` file.
    4.  Rename this file to `serviceAccountKey.json`.
    5.  Move the `serviceAccountKey.json` file into the `backend` folder.
4.  Start the backend server.
    ```bash
    python app.py
    ```
    **Leave this terminal window open.**

-----

### **Step 3: Frontend Setup**

1.  Open a **new** terminal window.
2.  Navigate into the `frontend` folder.
    ```bash
    cd smartwaste_ai/frontend
    ```
3.  Start the frontend server.
    ```bash
    python -m http.server 8080
    ```
4.  Open your web browser and go to this address: `http://localhost:8080`

-----

