from pyspark.sql import SparkSession
import logging

logger = logging.getLogger(__name__)

class SparkEngine:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SparkEngine, cls).__new__(cls)
            cls._instance._initialize_spark()
        return cls._instance

    def _initialize_spark(self):
        logger.info("Initializing SparkSession...")
        self.spark = SparkSession.builder \
            .appName("DGX-Spark-AI-Backend") \
            .config("spark.driver.memory", "4g") \
            .config("spark.sql.execution.arrow.pyspark.enabled", "true") \
            .getOrCreate()
        logger.info("SparkSession initialized successfully.")

    def get_session(self) -> SparkSession:
        return self.spark

# 싱글톤 인스턴스 전역 접근
spark_engine = SparkEngine()
