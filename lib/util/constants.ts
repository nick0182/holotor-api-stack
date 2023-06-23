import {CatchProps, RetryProps} from "aws-cdk-lib/aws-stepfunctions";

// --------------------------------- retries ----------------------------------------------

// Lambda transient service exceptions.
// See: https://docs.aws.amazon.com/step-functions/latest/dg/bp-lambda-serviceexception.html
const lambdaServiceErrors = [
  "Lambda.ClientExecutionTimeoutException",
  "Lambda.ServiceException",
  "Lambda.AWSLambdaException",
  "Lambda.SdkClientException",
];

const s3ServiceError = ["S3ServiceException"];

// retry on lambda service errors
export const lambdaServiceErrorsRetry: RetryProps = {
  errors: lambdaServiceErrors,
  maxAttempts: 2,
};

// retry on lambda service errors + lambda execution errors
export const allErrorsRetry: RetryProps = {
  errors: [...lambdaServiceErrors, "States.TaskFailed"],
  maxAttempts: 2,
};

// retry on lambda service errors + BonusVideoAlreadyDeletedException error
export const bonusVideoRetrieverErrorRetry: RetryProps = {
  errors: [...lambdaServiceErrors, "BonusVideoAlreadyDeletedException"],
  maxAttempts: 2,
};

// retry on s3ServiceError
export const s3ServiceErrorRetry: RetryProps = {
  errors: s3ServiceError,
  maxAttempts: 0
}