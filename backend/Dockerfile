# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Create a non-root user for Hugging Face Spaces (UID 1000 is default for HF Spaces)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Set the working directory in the container
WORKDIR $HOME/app

# Copy requirements file and install dependencies
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy the rest of the application code
COPY --chown=user . .

# Hugging Face Spaces expects the container to listen on port 7860
EXPOSE 7860

# Run the FastAPI app using Uvicorn on port 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
