import asyncio
import logging
from dotenv import load_dotenv
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from github_agent.agent import create_agent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("github_cli")

async def async_main():
    """Main async function to run the GitHub agent CLI."""
    try:
        # Create the agent and get the exit stack
        logger.info("Creating GitHub agent...")
        agent, exit_stack = await create_agent()
        
        # Initialize services
        session_service = InMemorySessionService()
        session = session_service.create_session(
            state={},
            app_name='github_agent',
            user_id='cli_user'
        )
        
        # Create runner
        runner = Runner(
            agent=agent,
            session_service=session_service
        )
        
        logger.info("GitHub CLI ready! Type 'exit' to quit.")
        
        # Main interaction loop
        while True:
            try:
                # Get user input
                user_input = input("\nEnter your GitHub command (or 'exit' to quit): ")
                
                if user_input.lower() == 'exit':
                    break
                
                # Create content object from user input
                content = types.Content(
                    role='user',
                    parts=[types.Part(text=user_input)]
                )
                
                # Process the request through the runner
                print("\nProcessing your request...")
                async for event in runner.run_async(
                    session_id=session.id,
                    user_id='cli_user',
                    new_message=content
                ):
                    if event.content and event.content.parts:
                        # Print the response text
                        for part in event.content.parts:
                            if hasattr(part, 'text'):
                                print(f"\nAgent: {part.text}")
                
            except KeyboardInterrupt:
                print("\nInterrupted by user. Type 'exit' to quit properly.")
            except Exception as e:
                logger.error(f"Error processing command: {str(e)}")
                print(f"Error: {str(e)}")
        
    except Exception as e:
        logger.error(f"Failed to initialize CLI: {str(e)}")
        raise e
    finally:
        # Clean up resources
        if 'exit_stack' in locals():
            await exit_stack.aclose()
        logger.info("CLI shutdown complete")

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    
    try:
        # Run the async main function
        asyncio.run(async_main())
    except KeyboardInterrupt:
        print("\nShutting down CLI...")
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        raise e 