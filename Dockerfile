FROM python:3.12-alpine@sha256:e6dae589c1c05976188fd3bd019afd091445fc533ed2ea29001beddc7368a9c8
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080
WORKDIR /app
RUN addgroup -S birthday && adduser -S birthday -G birthday
# No pip/apk installs: the server uses Python standard library only.
COPY --chown=birthday:birthday main.py requirements.txt ./
COPY --chown=birthday:birthday static ./static
USER birthday
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/healthz', timeout=2)"
CMD ["python", "main.py"]
