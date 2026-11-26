from crewai import Agent, Crew, Process, Task
from opik.integrations.crewai import track_crewai

from . import PROJECT_NAME

MODEL = "gpt-4o-mini"


def build_crew(model: str = MODEL, verbose: bool = True) -> Crew:
    casting_director = Agent(
        role="Casting Director",
        goal="Match volunteer actors to roles using only what the audition sheet says.",
        backstory="A retired drama teacher who never promises a part to someone who cannot make rehearsals.",
        llm=model,
    )
    stage_manager = Agent(
        role="Stage Manager",
        goal="Build a rehearsal schedule that fits the venue and the cast's availability.",
        backstory="Has run forty shows in borrowed church halls and knows every double-booking trap.",
        llm=model,
    )
    producer = Agent(
        role="Producer",
        goal="Turn the cast list and schedule into a budget the board can approve.",
        backstory="A volunteer treasurer who reads every line item twice and rounds costs up, never down.",
        llm=model,
    )

    cast_task = Task(
        name="Cast the show",
        description=(
            "Read the production notes below and assign an actor to every role. "
            "Use ONLY these notes. Never invent actors or availability.\n\n"
            "PRODUCTION NOTES:\n\n{season_notes}"
        ),
        expected_output=(
            "A table of role, actor, and one-line reason. Name any role that "
            "cannot be filled and say why."
        ),
        agent=casting_director,
    )
    schedule_task = Task(
        name="Schedule rehearsals",
        description=(
            "Using the cast list and the same notes, plan the rehearsal calendar "
            "up to opening night. Respect the hall's booking windows and each "
            "actor's blackout dates. Use ONLY these notes.\n\nPRODUCTION NOTES:\n\n{season_notes}"
        ),
        expected_output=(
            "A week-by-week schedule with rehearsal nights, and a short list of "
            "conflicts you could not avoid."
        ),
        agent=stage_manager,
        context=[cast_task],
    )
    budget_task = Task(
        name="Draft the budget",
        description=(
            "Combine the cast list and rehearsal schedule into a production "
            "budget. Include hall rental, costumes, rights fees and printing "
            "from the notes, and stay under the budget ceiling or say clearly "
            "what must be cut. Use ONLY the figures in these notes; never invent line items.\n\n"
            "PRODUCTION NOTES:\n\n{season_notes}"
        ),
        expected_output=(
            "A budget under 250 words: a line-item list, a total, the ceiling, "
            "and a one-sentence recommendation to the board."
        ),
        agent=producer,
        context=[cast_task, schedule_task],
    )

    return Crew(
        agents=[casting_director, stage_manager, producer],
        tasks=[cast_task, schedule_task, budget_task],
        process=Process.sequential,
        verbose=verbose,
    )


def enable_tracing(crew: Crew) -> Crew:
    # track_crewai hooks the crew so one kickoff becomes one trace, with a span per task and agent
    # and an llm span (tokens + estimated cost) per model call. Without it, nothing is logged.
    track_crewai(project_name=PROJECT_NAME, crew=crew)
    return crew
